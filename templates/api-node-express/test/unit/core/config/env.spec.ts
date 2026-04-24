describe("core/config/env", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function mockDotenvNoop() {
    // env.ts faz: import dotenv from "dotenv"; dotenv.config(...)
    // então precisamos mockar o default export com { config: fn }
    jest.doMock("dotenv", () => ({
      __esModule: true,
      default: { config: jest.fn() },
    }));
  }

  it("deve chamar process.exit(1) quando ENV estiver inválido (sem quebrar o jest)", async () => {
    mockDotenvNoop();

    // env inválido: sem os JWT_* obrigatórios
    process.env = { NODE_ENV: "test" };

    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await import("../../../../src/core/config/env");

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("não deve chamar process.exit(1) quando ENV estiver válido", async () => {
    mockDotenvNoop();

    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      API_VERSION: "v1",
      SWAGGER_ENABLED: "true",

      // SECURITY
      JWT_SECRET:
        "ffddb3759aca70db2ee91963cee26082a8bf46903e37baf5624962f5e9035170",
      JWT_ACCESS_SECRET:
        "ffddb3759aca70db2ee91963cee26082a8bf46903e37baf5624962f5e9035170",
      JWT_EXPIRES_IN: "15m",
      JWT_REFRESH_SECRET: "sua_chave_secreta_para_refresh_token",
      JWT_REFRESH_EXPIRES_IN: "7d",
      SALT: "10",
      UPDATE_MODEL: "true",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "admin123",

      // DB
      DB_DIALECT: "mysql",
      DB_HOST: "0.0.0.0",
      DB_PORT: "3306",
      DB_DATABASE: "db_app",
      DB_USERNAME: "user_app",
      DB_PASSWORD: "Senha@123",
      DB_NAME: "projeto_basico_com_crud_usuario",

      // AWS
      MEDIA_STORAGE: "local",
      S3_BUCKET: "your-s3-bucket-name",
      AWS_REGION: "your-aws-region",
      S3_PUBLIC_BASE_URL: "https://your-s3-bucket-name.s3.amazonaws.com/",
    };

    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    const { ENV } = await import("../../../../src/core/config/env");

    expect(exitSpy).not.toHaveBeenCalled();
    expect(ENV.NODE_ENV).toBe("test");
    expect(ENV.PORT).toBe(3000);

    exitSpy.mockRestore();
  });

  it("deve chamar process.exit(1) em produção sem ADMIN_PASSWORD no ambiente", async () => {
    mockDotenvNoop();

    process.env = {
      NODE_ENV: "production",
      PORT: "3000",
      API_VERSION: "v1",
      SWAGGER_ENABLED: "false",
      JWT_SECRET:
        "ffddb3759aca70db2ee91963cee26082a8bf46903e37baf5624962f5e9035170",
      JWT_ACCESS_SECRET:
        "ffddb3759aca70db2ee91963cee26082a8bf46903e37baf5624962f5e9035170",
      JWT_EXPIRES_IN: "15m",
      JWT_REFRESH_SECRET: "sua_chave_secreta_para_refresh_token",
      JWT_REFRESH_EXPIRES_IN: "7d",
      SALT: "10",
      ADMIN_EMAIL: "admin@example.com",
      DB_DIALECT: "mysql",
      DB_HOST: "db",
      DB_PORT: "3306",
      DB_DATABASE: "db_app",
      DB_USERNAME: "user_app",
      DB_PASSWORD: "x",
      MEDIA_STORAGE: "local",
    };
    delete process.env.ADMIN_PASSWORD;

    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await import("../../../../src/core/config/env");

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("deve chamar process.exit(1) em produção sem ADMIN_EMAIL no ambiente", async () => {
    mockDotenvNoop();

    process.env = {
      NODE_ENV: "production",
      PORT: "3000",
      API_VERSION: "v1",
      SWAGGER_ENABLED: "false",
      JWT_SECRET:
        "ffddb3759aca70db2ee91963cee26082a8bf46903e37baf5624962f5e9035170",
      JWT_ACCESS_SECRET:
        "ffddb3759aca70db2ee91963cee26082a8bf46903e37baf5624962f5e9035170",
      JWT_EXPIRES_IN: "15m",
      JWT_REFRESH_SECRET: "sua_chave_secreta_para_refresh_token",
      JWT_REFRESH_EXPIRES_IN: "7d",
      SALT: "10",
      ADMIN_PASSWORD: "admin123",
      DB_DIALECT: "mysql",
      DB_HOST: "db",
      DB_PORT: "3306",
      DB_DATABASE: "db_app",
      DB_USERNAME: "user_app",
      DB_PASSWORD: "x",
      MEDIA_STORAGE: "local",
    };
    delete process.env.ADMIN_EMAIL;

    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await import("../../../../src/core/config/env");

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("com módulo auth-jwt presente no disco, rejeita JWT_SECRET com menos de 32 caracteres", async () => {
    mockDotenvNoop();
    const fsActual = jest.requireActual("node:fs") as typeof import("node:fs");
    const spy = jest.spyOn(fsActual, "existsSync").mockImplementation((p) => {
      const s = String(p);
      if (s.includes("auth-jwt") && s.includes("jwt-verify-middleware")) {
        return true;
      }
      return fsActual.existsSync(p);
    });

    process.env = {
      NODE_ENV: "test",
      PORT: "3000",
      API_VERSION: "v1",
      SWAGGER_ENABLED: "true",
      JWT_SECRET: "0123456789abcdef0123456789abcde",
      JWT_ACCESS_SECRET:
        "ffddb3759aca70db2ee91963cee26082a8bf46903e37baf5624962f5e9035170",
      JWT_EXPIRES_IN: "15m",
      JWT_REFRESH_SECRET: "sua_chave_secreta_para_refresh_token",
      JWT_REFRESH_EXPIRES_IN: "7d",
      SALT: "10",
      UPDATE_MODEL: "true",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "admin123",
      DB_DIALECT: "mysql",
      DB_HOST: "0.0.0.0",
      DB_PORT: "3306",
      DB_DATABASE: "db_app",
      DB_USERNAME: "user_app",
      DB_PASSWORD: "Senha@123",
      DB_NAME: "projeto_basico_com_crud_usuario",
      MEDIA_STORAGE: "local",
      S3_BUCKET: "your-s3-bucket-name",
      AWS_REGION: "your-aws-region",
      S3_PUBLIC_BASE_URL: "https://your-s3-bucket-name.s3.amazonaws.com/",
    };

    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await import("../../../../src/core/config/env");

    expect(exitSpy).toHaveBeenCalledWith(1);

    spy.mockRestore();
    exitSpy.mockRestore();
    errSpy.mockRestore();
  });
});
