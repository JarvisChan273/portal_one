export class PortalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalError";
  }
}
