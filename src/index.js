import express from "express";
import http from "http";
import { Server } from "socket.io";
import "dotenv/config";
import router from "./repositories/userRepository.js";
import { swaggerDocs, swaggerUi } from "./swagger.js";
import path from "path";
import { fileURLToPath } from "url"; // fileURLToPath 추가
import axios from "axios";
import upload from "./multerconfig.js";
import fs from "fs";
import mqtt from "mqtt";
import cors from "cors";
import { OpenAI } from "openai";
import { compareData } from "./controllers/updatePortInfo.js";
import { sendPrompt } from "./controllers/APIdescription.js";
// MQTT 설정
export const mqttClient = mqtt.connect(
  "mqtt://" + process.env.MQTT_BROKER_IP + ":1883"
); // 공용 MQTT 브로커 사용
const topic = "test/cam"; // MQTT 토픽
const receivetopic = "test/gpt"; //수신할 토픽
const currentPositionTopic = "test/pos"; //현재 방 위치

mqttClient.on("connect", () => {
  console.log("MQTT 연결 성공");
  mqttClient.subscribe(receivetopic, { qos: 0 }, (err) => {
    if (err) {
      console.error("Subscription failed", err);
    }
  });
  mqttClient.subscribe(currentPositionTopic, (err) => {
    if (err) {
      console.error("position topic Subscription failed", err);
    }
  });
});

export let currentArea = 0;
const colorToAreaId = {
  o: 0,
  y: 1,
  r: 2,
  b: 3,
  p: 4,
  g: 5,
};
//콘센트 정보 수신받음
mqttClient.on("message", async function (topic, message) {
  if (topic === receivetopic) {
    //파싱해서 db에 갱신해야함, 만약 새로운 포트면 사용자한테 폼으로 요청해서 데이터 수집해야함.

    console.log("메시지 수신 !!");
    console.log(message.toString());

    compareData(message.toString());
  } else if (topic == currentPositionTopic) {
    console.log("현재 위치 메시지 수신 완료");
    if (colorToAreaId[colormessage.toString()]) {
      currentArea = colorToAreaId[colormessage.toString()];
    }
  }
});

// openAi 설정

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());
app.use(express.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../public")));

//rest api를 통한 db 데이터 접근
app.use("/api", router);

//swagger 배포 경로
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const port = 3000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("A user connected");

  // 기존 메시지 가져와서 전송
  axios
    .get("http://localhost:3000/api/messages")
    .then((response) => {
      socket.emit("chat history", response.data.slice(-10));
    })
    .catch((error) => {
      console.error("Failed to fetch chat history:", error);
    });

  // 메시지 받았을 때의 이벤트
  socket.on("chat message", async (msg) => {
    mqttClient.publish("test/new-message", "new!");

    let messageText = msg.message_text;
    messageText = messageText.replace(/'/g, `\\'`);
    messageText = messageText.replace(/"/g, `\\"`);
    const messageData = {
      message_text: msg.message_text,
      message_is_user: msg.message_is_user ? 1 : 0,
      message_item_id: msg.message_item_id,
      message_item_type: msg.message_item_type,
    };
    const messageToDB = {
      message_text: messageText,
      message_is_user: msg.message_is_user ? 1 : 0,
      message_item_id: msg.message_item_id,
      message_item_type: msg.message_item_type,
    };

    // DB에 메시지 저장
    axios
      .post("http://localhost:3000/api/messages", messageToDB)
      .then((res) => {
        messageData.message_id = res.data.insertId;
        io.emit("chat message", messageData); // 모든 클라이언트에 메시지 전송
      })
      .catch((error) => {
        console.error("Failed to save message:", error.message);
      });

    //gpt 전송
    if (messageData.message_is_user === 1) {
      sendPrompt(messageData);
    }
  });

  // 연결 해제 시
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// 이미지 파일 삭제 함수
const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`파일 삭제 실패: ${err.message}`);
    } else {
      //console.log(`파일 삭제 성공: ${filePath}`);
    }
  });
};

// 이미지 업로드 라우트
app.post("/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "이미지 파일이 업로드되지 않았습니다." });
    }

    const filePath = req.file.path;
    //console.log(`이미지 업로드 성공: ${filePath}`);

    // MQTT로 이미지 경로 전송
    mqttClient.publish(
      topic,
      "http://" +
        process.env.SERVER_IP +
        ":" +
        port.toString() +
        "/" +
        filePath.substring(filePath.indexOf("\\") + 1).replace(/\\/g, "/"),
      (err) => {
        if (err) {
          console.error(`MQTT 메시지 전송 실패: ${err.message}`);
          return res.status(500).json({ error: "MQTT 메시지 전송 실패" });
        }
        //console.log(`MQTT 메시지 전송 성공: ${filePath}`);
        res.status(200).json({
          message: "이미지 업로드 및 MQTT 메시지 전송 성공",
          filePath,
        });
      }
    );

    // 1초 후 파일 삭제 예약
    setTimeout(() => deleteFile(filePath), 1000);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "서버 에러가 발생했습니다." });
  }
});

// 연결 실패 및 에러 처리
mqttClient.on("error", (err) => {
  console.error(`MQTT 연결 실패: ${err.message}`);
});

//채팅 서버 시작
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
