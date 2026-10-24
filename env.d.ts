declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      PORT: string;
      REDIS_PORT: string;
      NODE_ENV: "development" | "production" | "test";
      DB_HOST: string;
      DB_PORT: string;
      DB_USER: string;
      DB_PASSWORD: string;
      DB_NAME: string;
      BETTER_AUTH_SECRET: string;
      BETTER_AUTH_URL: string;
      CLIENT_URL: string;
      RESEND_API_KEY: string;
      EMAIL_FROM: string;
      SLACK_TOKEN: string;
    }
  }
}

export {};
