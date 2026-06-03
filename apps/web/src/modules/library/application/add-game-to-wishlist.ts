import type {
  AddGameToWishlistResult,
  LibraryRepository
} from "./ports";

export function addGameToWishlistUseCase(
  input: {
    userId: string;
    catalogGameId: string;
  },
  repository: LibraryRepository
): Promise<AddGameToWishlistResult> {
  return repository.addGameToWishlist(input);
}
