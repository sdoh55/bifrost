"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelMultiselect } from "@/components/ui/modelMultiselect";
import { useCreatePricingOverrideMutation } from "@/lib/store/apis/configApi";
import { PricingOverride } from "@/lib/types/pricing";
import { useState } from "react";

interface PricingOverrideModalProps {
	override: PricingOverride | null;
	availableProviders: string[];
	isOpen: boolean;
	onClose: () => void;
	onSave: () => void;
}

export function PricingOverrideModal({ override, availableProviders, isOpen, onClose, onSave }: PricingOverrideModalProps) {
	const [createPricingOverride] = useCreatePricingOverrideMutation();
	const [formData, setFormData] = useState({
		model: override?.model ?? "",
		provider: override?.provider ?? "",
		input_cost_per_token: override?.input_cost_per_token ? (override.input_cost_per_token * 1000000).toFixed(4) : "",
		output_cost_per_token: override?.output_cost_per_token ? (override.output_cost_per_token * 1000000).toFixed(4) : "",
		cache_read_input_token_cost: override?.cache_read_input_token_cost ? (override.cache_read_input_token_cost * 1000000).toFixed(4) : "",
		cache_creation_input_token_cost: override?.cache_creation_input_token_cost ? (override.cache_creation_input_token_cost * 1000000).toFixed(4) : "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const toPerToken = (value: string) => {
			if (!value.trim()) return null;
			const perMillion = parseFloat(value);
			if (isNaN(perMillion)) return null;
			return perMillion / 1000000;
		};

		await createPricingOverride({
			...formData,
			input_cost_per_token: toPerToken(formData.input_cost_per_token),
			output_cost_per_token: toPerToken(formData.output_cost_per_token),
			cache_read_input_token_cost: toPerToken(formData.cache_read_input_token_cost),
			cache_creation_input_token_cost: toPerToken(formData.cache_creation_input_token_cost),
		});
		onSave();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent disableOutsideClick={false}>
				<DialogHeader>
					<DialogTitle>{override ? "Edit" : "Add"} Pricing Override</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground mb-4">Pricing applies to all request modes for this model/provider.</p>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4">
						<div>
							<Label htmlFor="provider">Provider</Label>
							<Select
								value={formData.provider}
								onValueChange={(value) => {
									setFormData({ ...formData, provider: value, model: "" });
								}}
							>
								<SelectTrigger id="provider" disabled={!!override}>
									<SelectValue placeholder={availableProviders.length === 0 ? "No providers configured" : "Select a provider"} />
								</SelectTrigger>
								<SelectContent>
									{availableProviders.length === 0 ? (
										<div className="px-2 py-1.5 text-sm text-muted-foreground">
											Configure providers in Model Providers first
										</div>
									) : (
										availableProviders.map((provider) => (
											<SelectItem key={provider} value={provider}>
												{provider}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="model">Model</Label>
							<ModelMultiselect
								provider={formData.provider}
								value={formData.model}
								onChange={(model) => setFormData((prev) => ({ ...prev, model: model ?? "" }))}
								disabled={!formData.provider || !!override}
								isSingleSelect={true}
								placeholder="Select or search for a model..."
							/>
							<input type="hidden" name="model" value={formData.model} required />
						</div>
						<div>
							<Label htmlFor="input_cost">Input Cost (per 1M tokens)</Label>
							<Input
								id="input_cost"
								type="number"
								step="0.0001"
								min="0"
								value={formData.input_cost_per_token}
								onChange={(e) => setFormData({ ...formData, input_cost_per_token: e.target.value })}
								placeholder="Leave empty to use master value"
							/>
						</div>
						<div>
							<Label htmlFor="output_cost">Output Cost (per 1M tokens)</Label>
							<Input
								id="output_cost"
								type="number"
								step="0.0001"
								min="0"
								value={formData.output_cost_per_token}
								onChange={(e) => setFormData({ ...formData, output_cost_per_token: e.target.value })}
								placeholder="Leave empty to use master value"
							/>
						</div>
						<div>
							<Label htmlFor="cache_read">Cache Read Cost (per 1M tokens)</Label>
							<Input
								id="cache_read"
								type="number"
								step="0.0001"
								min="0"
								value={formData.cache_read_input_token_cost}
								onChange={(e) => setFormData({ ...formData, cache_read_input_token_cost: e.target.value })}
								placeholder="Leave empty to use master value"
							/>
						</div>
						<div>
							<Label htmlFor="cache_create">Cache Creation Cost (per 1M tokens)</Label>
							<Input
								id="cache_create"
								type="number"
								step="0.0001"
								min="0"
								value={formData.cache_creation_input_token_cost}
								onChange={(e) => setFormData({ ...formData, cache_creation_input_token_cost: e.target.value })}
								placeholder="Leave empty to use master value"
							/>
						</div>
					</div>
					<div className="mt-6 flex justify-end space-x-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={!formData.model || !formData.provider}>
							{override ? "Update" : "Create"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}