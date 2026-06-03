import type { BuildingCategory } from '../types/domain'

export const categoryColors: Record<BuildingCategory, string> = {
  residence:      '#c8a96e',  // Anno gold
  production:     '#5b7a99',  // steel blue
  public_service: '#5a9e6f',  // green
  infrastructure: '#6b7280',  // neutral gray
}
