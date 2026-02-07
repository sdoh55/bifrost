package modelcatalog

import (
	"testing"

	bifrost "github.com/maximhq/bifrost/core"
	"github.com/maximhq/bifrost/core/schemas"
	configstoreTables "github.com/maximhq/bifrost/framework/configstore/tables"
	"github.com/stretchr/testify/assert"
)

func TestApplyPricingOverride_PartialOverride(t *testing.T) {
	inputCost := bifrost.Ptr(0.00002)

	override := &configstoreTables.TablePricingOverride{
		Model:             "gpt-4o",
		Provider:          "openai",
		InputCostPerToken: inputCost,
	}

	reqType := schemas.ChatCompletionRequest
	result := applyPricingOverride(override, &reqType)

	assert.Equal(t, "gpt-4o", result.Model)
	assert.Equal(t, "openai", result.Provider)
	assert.Equal(t, "chat", result.Mode)
	assert.Equal(t, 0.00002, result.InputCostPerToken)
	assert.Equal(t, float64(0), result.OutputCostPerToken)
	assert.Nil(t, result.CacheReadInputTokenCost)
}

func TestApplyPricingOverride_AllFields(t *testing.T) {
	inputCost := 0.00005
	outputCost := 0.00015
	cacheRead := 0.000001
	cacheCreate := 0.000002

	override := &configstoreTables.TablePricingOverride{
		Model:                       "test-model",
		Provider:                    "test-provider",
		InputCostPerToken:           &inputCost,
		OutputCostPerToken:          &outputCost,
		CacheReadInputTokenCost:     &cacheRead,
		CacheCreationInputTokenCost: &cacheCreate,
	}

	reqType := schemas.EmbeddingRequest
	result := applyPricingOverride(override, &reqType)

	assert.Equal(t, "test-model", result.Model)
	assert.Equal(t, "test-provider", result.Provider)
	assert.Equal(t, "embedding", result.Mode)
	assert.Equal(t, 0.00005, result.InputCostPerToken)
	assert.Equal(t, 0.00015, result.OutputCostPerToken)
	assert.Equal(t, &cacheRead, result.CacheReadInputTokenCost)
	assert.Equal(t, &cacheCreate, result.CacheCreationInputTokenCost)
}

func TestApplyPricingOverride_NilOverride(t *testing.T) {
	reqType := schemas.ChatCompletionRequest
	result := applyPricingOverride(nil, &reqType)

	assert.Nil(t, result)
}

func TestMakeKey(t *testing.T) {
	tests := []struct {
		model    string
		provider string
		mode     string
		expected string
	}{
		{"gpt-4o", "openai", "chat_completion", "gpt-4o|openai|chat_completion"},
		{"claude-3-5-sonnet", "anthropic", "text_completion", "claude-3-5-sonnet|anthropic|text_completion"},
		{"embeddings", "cohere", "embedding", "embeddings|cohere|embedding"},
	}

	for _, tt := range tests {
		result := makeKey(tt.model, tt.provider, tt.mode)
		assert.Equal(t, tt.expected, result)
	}
}

func TestNormalizeProvider(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"OpenAI", "OpenAI"},
		{"OPENAI", "OPENAI"},
		{"openai", "openai"},
		{"vertex_ai", "vertex"},
		{"google-vertex", "vertex"},
		{"Anthropic", "Anthropic"},
		{"bedrock", "bedrock"},
		{"cohere", "cohere"},
	}

	for _, tt := range tests {
		result := normalizeProvider(tt.input)
		assert.Equal(t, tt.expected, result, "normalizeProvider(%q) = %q, want %q", tt.input, result, tt.expected)
	}
}

func TestNormalizeRequestType(t *testing.T) {
	tests := []struct {
		input    schemas.RequestType
		expected string
	}{
		{schemas.ChatCompletionRequest, "chat"},
		{schemas.TextCompletionRequest, "completion"},
		{schemas.EmbeddingRequest, "embedding"},
		{schemas.ResponsesRequest, "responses"},
		{schemas.SpeechRequest, "audio_speech"},
		{schemas.TranscriptionRequest, "audio_transcription"},
		{schemas.ImageGenerationRequest, "image_generation"},
	}

	for _, tt := range tests {
		result := normalizeRequestType(tt.input)
		assert.Equal(t, tt.expected, result, "normalizeRequestType(%q) = %q, want %q", tt.input, result, tt.expected)
	}
}

func TestConvertPricingDataToTableModelPricing(t *testing.T) {
	inputCost := 0.00001
	outputCost := 0.00003

	entry := PricingEntry{
		InputCostPerToken:  inputCost,
		OutputCostPerToken: outputCost,
		Provider:           "openai",
		Mode:               "chat_completion",
	}

	result := convertPricingDataToTableModelPricing("gpt-4o", entry)

	assert.Equal(t, "gpt-4o", result.Model)
	assert.Equal(t, "openai", result.Provider)
	assert.Equal(t, "chat_completion", result.Mode)
	assert.Equal(t, inputCost, result.InputCostPerToken)
	assert.Equal(t, outputCost, result.OutputCostPerToken)
}

func TestConvertTableModelPricingToPricingData(t *testing.T) {
	tablePricing := &configstoreTables.TableModelPricing{
		Model:              "gpt-4o",
		Provider:           "openai",
		Mode:               "chat_completion",
		InputCostPerToken:  0.00001,
		OutputCostPerToken: 0.00003,
	}

	result := convertTableModelPricingToPricingData(tablePricing)

	assert.Equal(t, 0.00001, result.InputCostPerToken)
	assert.Equal(t, 0.00003, result.OutputCostPerToken)
	assert.Equal(t, "openai", result.Provider)
	assert.Equal(t, "chat_completion", result.Mode)
}

func TestGetSafeFloat64(t *testing.T) {
	value := 0.00005
	defaultValue := 0.00001

	result := getSafeFloat64(&value, defaultValue)
	assert.Equal(t, 0.00005, result)

	result = getSafeFloat64(nil, defaultValue)
	assert.Equal(t, 0.00001, result)
}
