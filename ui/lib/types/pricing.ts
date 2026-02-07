export interface PricingOverride {
	id: number;
	model: string;
	provider: string;
	input_cost_per_token?: number | null;
	output_cost_per_token?: number | null;
	cache_read_input_token_cost?: number | null;
	cache_creation_input_token_cost?: number | null;
	created_at: string;
	updated_at: string;
}

export interface PricingOverridesResponse {
	overrides: PricingOverride[];
	count: number;
}

export interface CreatePricingOverrideRequest {
	model: string;
	provider: string;
	input_cost_per_token?: number | null;
	output_cost_per_token?: number | null;
	cache_read_input_token_cost?: number | null;
	cache_creation_input_token_cost?: number | null;
}