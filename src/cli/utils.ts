export function toKebabCase(input: string): string {
  return input
    .trim() // Remove leading/trailing whitespace
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/([a-z])([A-Z])/g, "$1-$2") // Insert dash before uppercase letters
    .toLowerCase(); // Convert to lowercase
}
