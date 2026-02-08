"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type FilterState = {
  priceRange: [number, number];
  rating: number;
  productTypes: string[];
  tags: string[];
};

type ProductFiltersProps = {
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  availableTypes: string[];
  availableTags: string[];
  maxPrice: number;
};

const ratingOptions = [0, 4, 3, 2, 1] as const;

export function ProductFilters({
  filters,
  onFiltersChange,
  availableTypes,
  availableTags,
  maxPrice,
}: ProductFiltersProps) {
  const clampValue = (value: number) => {
    if (Number.isNaN(value)) return 0;
    return Math.min(Math.max(value, 0), maxPrice);
  };

  const updatePrice = (nextMin: number, nextMax: number) => {
    const minValue = clampValue(nextMin);
    const maxValue = clampValue(nextMax);
    const normalizedMin = Math.min(minValue, maxValue);
    const normalizedMax = Math.max(minValue, maxValue);

    onFiltersChange({
      ...filters,
      priceRange: [normalizedMin, normalizedMax],
    });
  };

  const toggleListValue = (list: string[], value: string) => {
    if (list.includes(value)) {
      return list.filter((item) => item !== value);
    }
    return [...list, value];
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Filters</h3>
        <p className="text-xs text-muted-foreground">
          Refine your results
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Price Range
          </p>
          <div className="mt-3 grid gap-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={maxPrice}
                value={filters.priceRange[0]}
                onChange={(event) =>
                  updatePrice(Number(event.target.value), filters.priceRange[1])
                }
                className="h-8"
                aria-label="Minimum price"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="number"
                min={0}
                max={maxPrice}
                value={filters.priceRange[1]}
                onChange={(event) =>
                  updatePrice(filters.priceRange[0], Number(event.target.value))
                }
                className="h-8"
                aria-label="Maximum price"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Max: ₹{Number(maxPrice).toLocaleString()}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rating
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ratingOptions.map((rating) => (
              <Button
                key={rating}
                size="sm"
                variant={filters.rating === rating ? "secondary" : "outline"}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    rating,
                  })
                }
              >
                {rating === 0 ? "Any" : `${rating}+`}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Product Type
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTypes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No types available
              </p>
            )}
            {availableTypes.map((type) => (
              <Button
                key={type}
                size="sm"
                variant={
                  filters.productTypes.includes(type) ? "secondary" : "outline"
                }
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    productTypes: toggleListValue(filters.productTypes, type),
                  })
                }
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tags
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTags.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No tags available
              </p>
            )}
            {availableTags.map((tag) => (
              <Button
                key={tag}
                size="sm"
                variant={filters.tags.includes(tag) ? "secondary" : "outline"}
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    tags: toggleListValue(filters.tags, tag),
                  })
                }
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
