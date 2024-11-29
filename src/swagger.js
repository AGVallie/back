import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "API 문서",
      version: "1.0.0",
      description: "Node.js Express API 문서",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
      {
        url: "http://70.12.107.165:3000",
      },
    ],
  },
  apis: ["src/repositories/*.js"], // 주석을 추가한 API 파일 경로 설정
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);

export { swaggerUi, swaggerDocs };
