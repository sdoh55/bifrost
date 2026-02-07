"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage, useForcePricingSyncMutation, useGetCoreConfigQuery, useUpdateCoreConfigMutation } from "@/lib/store";
import { RbacOperation, RbacResource, useRbac } from "@/app/_fallbacks/enterprise/lib";
import { useGetProvidersQuery } from "@/lib/store/apis/providersApi";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useGetPricingOverridesQuery, useCreatePricingOverrideMutation, useDeletePricingOverrideMutation } from "@/lib/store/apis/configApi";
import { PricingOverride } from "@/lib/types/pricing";
import { PricingOverrideModal } from "./pricingOverrideModal";

interface PricingFormData {
	pricing_datasheet_url: string;
	pricing_sync_interval_hours: number;
}

export default function PricingConfigView() {
	const hasSettingsUpdateAccess = useRbac(RbacResource.Settings, RbacOperation.Update);
	const { data: bifrostConfig } = useGetCoreConfigQuery({ fromDB: true });
	const config = bifrostConfig?.framework_config;
	const [updateCoreConfig, { isLoading }] = useUpdateCoreConfigMutation();
	const [forcePricingSync, { isLoading: isForceSyncing }] = useForcePricingSyncMutation();
	const { data: overridesData, isLoading: loadingOverrides, refetch: refetchOverrides } = useGetPricingOverridesQuery();
	const { data: providersData, isLoading: loadingProviders } = useGetProvidersQuery();

	const availableProviders = useMemo(() => {
		if (!providersData) return [];
		const providers = providersData
			.filter(
				(p) =>
					(p.keys && p.keys.length > 0) ||
					p.network_config?.is_key_less ||
					p.custom_provider_config?.is_key_less,
			)
			.map((p) => p.name);
		return providers.sort();
	}, [providersData]);
	const [deletePricingOverride] = useDeletePricingOverrideMutation();
	const [showAddModal, setShowAddModal] = useState(false);
	const [editingOverride, setEditingOverride] = useState<PricingOverride | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isDirty },
		reset,
		watch,
	} = useForm<PricingFormData>({
		defaultValues: {
			pricing_datasheet_url: "",
			pricing_sync_interval_hours: 24,
		},
	});

	const formValues = watch();

	useEffect(() => {
		if (bifrostConfig && config) {
			reset({
				pricing_datasheet_url: config.pricing_url || "",
				pricing_sync_interval_hours: Math.round(config.pricing_sync_interval / 3600) || 24,
			});
		}
	}, [config, bifrostConfig, reset]);

	const hasChanges = useMemo(() => {
		if (!config || !isDirty) return false;
		const serverUrl = config.pricing_url || "";
		const serverInterval = Math.round(config.pricing_sync_interval / 3600);
		return formValues.pricing_datasheet_url !== serverUrl || formValues.pricing_sync_interval_hours !== serverInterval;
	}, [config, formValues, isDirty]);

	const onSubmit = async (data: PricingFormData) => {
		try {
			await updateCoreConfig({
				...bifrostConfig!,
				framework_config: {
					...config,
					id: bifrostConfig?.framework_config.id || 0,
					pricing_url: data.pricing_datasheet_url,
					pricing_sync_interval: data.pricing_sync_interval_hours * 3600,
				},
			}).unwrap();
			toast.success("Pricing configuration updated successfully.");
			reset(data);
		} catch (error) {
			toast.error(getErrorMessage(error));
		}
	};

	const handleForceSync = async () => {
		try {
			await forcePricingSync().unwrap();
			toast.success("Pricing sync triggered successfully.");
		} catch (error) {
			toast.error(getErrorMessage(error));
		}
	};

	const handleDelete = async (model: string, provider: string) => {
		if (confirm(`Are you sure you want to delete the pricing override for ${model} (${provider})?`)) {
			await deletePricingOverride({ model, provider });
			refetchOverrides();
		}
	};

	return (
		<div className="mx-auto w-full max-w-6xl space-y-6">
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-semibold tracking-tight">Pricing Configuration</h2>
						<p className="text-muted-foreground text-sm">Configure custom pricing datasheet and sync intervals.</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" type="button" onClick={handleForceSync} disabled={isForceSyncing || !hasSettingsUpdateAccess}>
							{isForceSyncing ? "Syncing..." : "Force Sync Now"}
						</Button>
						<Button type="submit" disabled={!hasChanges || isLoading || !hasSettingsUpdateAccess}>
							{isLoading ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</div>

				<div className="space-y-4">
					{/* Pricing Datasheet URL */}
					<div className="space-y-2 rounded-lg border p-4">
						<div className="space-y-0.5">
							<Label htmlFor="pricing-datasheet-url">Pricing Datasheet URL</Label>
							<p className="text-muted-foreground text-sm">URL to a custom pricing datasheet. Leave empty to use default pricing.</p>
						</div>
						<Input
							id="pricing-datasheet-url"
							type="text"
							placeholder="https://example.com/pricing.json"
							{...register("pricing_datasheet_url", {
								pattern: {
									value: /^(https?:\/\/)?((localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?|([\da-z\.-]+)\.([a-z\.]{2,6}))([\/\w \.-]*)*\/?$/,
									message: "Please enter a valid URL.",
								},
								validate: {
									checkIfHttp: (value) => {
										if (!value) return true; // Allow empty
										return value.startsWith("http://") || value.startsWith("https://") || "URL must start with http:// or https://";
									},
								},
							})}
							className={errors.pricing_datasheet_url ? "border-destructive" : ""}
						/>
						{errors.pricing_datasheet_url && <p className="text-destructive text-sm">{errors.pricing_datasheet_url.message}</p>}
					</div>

					{/* Pricing Sync Interval */}
					<div className="space-y-2 rounded-lg border p-4">
						<div className="space-y-2">
							<div className="space-y-0.5">
								<Label htmlFor="pricing-sync-interval">Pricing Sync Interval (hours)</Label>
								<p className="text-muted-foreground text-sm">How often to sync pricing data from the datasheet URL.</p>
							</div>
							<Input
								id="pricing-sync-interval"
								type="number"
								className={errors.pricing_sync_interval_hours ? "border-destructive" : ""}
								{...register("pricing_sync_interval_hours", {
									required: "Pricing sync interval is required",
									min: {
										value: 1,
										message: "Sync interval must be at least 1 hour",
									},
									max: {
										value: 8760,
										message: "Sync interval cannot exceed 8760 hours (1 year)",
									},
									valueAsNumber: true,
								})}
							/>
							{errors.pricing_sync_interval_hours && (
								<p className="text-destructive text-sm">{errors.pricing_sync_interval_hours.message}</p>
							)}
						</div>
					</div>
				</div>
			</form>

			{/* Pricing Overrides Section */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-semibold tracking-tight">Pricing Overrides</h2>
						<p className="text-muted-foreground text-sm">Set custom prices for specific models that take priority over the master pricing list.</p>
					</div>
					<Button onClick={() => setShowAddModal(true)} disabled={!hasSettingsUpdateAccess}>
						Add Override
					</Button>
				</div>

				{loadingOverrides ? (
					<div className="text-center py-8">Loading...</div>
				) : (
					<div className="rounded-lg border shadow overflow-hidden">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Provider</TableHead>
									<TableHead>Model</TableHead>
									<TableHead>Input Cost</TableHead>
									<TableHead>Output Cost</TableHead>
									<TableHead>Cache Read</TableHead>
									<TableHead>Cache Create</TableHead>
									<TableHead className="w-[100px]">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{overridesData?.overrides.map((override) => (
									<TableRow key={`${override.model}-${override.provider}`}>
										<TableCell>{override.provider}</TableCell>
										<TableCell className="font-medium">{override.model}</TableCell>
										<TableCell>
											{override.input_cost_per_token !== undefined && override.input_cost_per_token !== null
												? `$${(override.input_cost_per_token * 1000000).toFixed(4)}/1M`
												: "-"}
										</TableCell>
										<TableCell>
											{override.output_cost_per_token !== undefined && override.output_cost_per_token !== null
												? `$${(override.output_cost_per_token * 1000000).toFixed(4)}/1M`
												: "-"}
										</TableCell>
										<TableCell>
											{override.cache_read_input_token_cost !== undefined && override.cache_read_input_token_cost !== null
												? `$${(override.cache_read_input_token_cost * 1000000).toFixed(4)}/1M`
												: "-"}
										</TableCell>
										<TableCell>
											{override.cache_creation_input_token_cost !== undefined && override.cache_creation_input_token_cost !== null
												? `$${(override.cache_creation_input_token_cost * 1000000).toFixed(4)}/1M`
												: "-"}
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setEditingOverride(override)}
												className="h-8 w-8 p-0"
												disabled={!hasSettingsUpdateAccess}
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleDelete(override.model, override.provider)}
												className="h-8 w-8 p-0 text-destructive hover:text-destructive"
												disabled={!hasSettingsUpdateAccess}
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
											</Button>
										</TableCell>
									</TableRow>
								))}
								{overridesData?.count === 0 && (
									<TableRow>
										<TableCell colSpan={7} className="text-center py-8">
											No pricing overrides configured. Click "Add Override" to create one.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				)}
			</div>

			{(showAddModal || editingOverride) && (
				<PricingOverrideModal
					override={editingOverride}
					availableProviders={availableProviders}
					isOpen={true}
					onClose={() => {
						setShowAddModal(false);
						setEditingOverride(null);
					}}
					onSave={() => {
						setShowAddModal(false);
						setEditingOverride(null);
						refetchOverrides();
					}}
				/>
			)}
		</div>
	);
}
