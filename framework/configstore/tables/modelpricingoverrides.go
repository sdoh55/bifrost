package tables

import (
	"time"
)

type TablePricingOverride struct {
	ID       uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Model    string `gorm:"type:varchar(255);not null;uniqueIndex:idx_pricing_override_model_provider" json:"model"`
	Provider string `gorm:"type:varchar(50);not null;uniqueIndex:idx_pricing_override_model_provider" json:"provider"`

	InputCostPerToken           *float64 `gorm:"default:null" json:"input_cost_per_token,omitempty"`
	OutputCostPerToken          *float64 `gorm:"default:null" json:"output_cost_per_token,omitempty"`
	CacheReadInputTokenCost     *float64 `gorm:"default:null;column:cache_read_input_token_cost" json:"cache_read_input_token_cost,omitempty"`
	CacheCreationInputTokenCost *float64 `gorm:"default:null;column:cache_creation_input_token_cost" json:"cache_creation_input_token_cost,omitempty"`

	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (TablePricingOverride) TableName() string { return "governance_model_pricing_overrides" }
