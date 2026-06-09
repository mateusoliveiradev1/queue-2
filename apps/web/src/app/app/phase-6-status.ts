export function getPhase6StatusMessage(state: string | null): string | null {
  switch (state) {
    case "roleta-principal":
      return "Resultado da roleta travado como Principal.";
    default:
      return null;
  }
}
