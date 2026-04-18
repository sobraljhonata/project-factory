export class InvalidParamError extends Error {
  constructor(paramName: string) {
    super();
    this.name = "InvalidParamError";
    this.message = `Verifique o seguinte parâmetro inválido: ${paramName}`;
  }
}