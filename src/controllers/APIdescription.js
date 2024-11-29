import axios from "axios";
import { openai } from "../index.js";
import {
  getPortsUsedFor,
  getHighRiskPorts,
  getPortByName,
  sendChat,
  startInspection,
} from "./serverAPI.js";

const serverAPIfunctions = {
  getPortsUsedFor,
  getHighRiskPorts,
  getPortByName,
  sendChat,
  startInspection,
};

const tools = [
  {
    type: "function",
    function: {
      name: "getPortsUsedFor",
      //strict: true,
      description:
        "사용시간(분)을 입력 인자로 받아 사용시간 이상인 포트 목록을 출력하는 함수이다.",
      parameters: {
        type: "object",
        properties: {
          minutes: {
            type: "number",
            description:
              "사용자가 요청한 사용 시간(분) 기준으로, 1시간은 60분, 1일은 24시간임을 고려해서 분으로 변환하여 입력해야 함",
          },
        },
        required: ["minutes"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getHighRiskPorts",
      //strict: true,
      description:
        "위험도가 높은 포트 목록을 출력하는 함수이다. 위험도가 높은게 어떤게 있는지 묻거나, 꽂혀 있는 것중에 어떤 게 위험한지 물어봤을 때 호출하면 됨",
    },
  },
  {
    type: "function",
    function: {
      name: "getPortByName",
      //strict: true,
      description:
        "포트에 꽂힌 기기 이름을 입력 받아 포트 정보를 출력하는 함수이다.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "사용자 정보를 요청한 기기(포트) 이름",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "startInspection",
      //strict: true,
      description: "로봇에게 집안 점검을 명령하는 함수이다.",
    },
  },
];

export async function sendPrompt(messageData) {
  const history = await axios.get("http://localhost:3000/api/messages");
  const recentMessages = history.data.slice(-11);
  const prompt = recentMessages.map((message) => {
    return {
      role: message.message_is_user ? "user" : "assistant",
      content: message.message_text,
    };
  });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-11-20",
    messages: [
      {
        role: "system",
        content:
          "이 챗봇은 스스로를 '볼리'라고 지칭해야 돼. 너의 별명은 'AI 컴패니언 볼리'야. 이 챗봇은 집안의 콘센트를 점검하기 위해 만들어졌고 사용자에게 귀여움을 받고 싶어. 사용자에게 대답할 때 귀엽게 이야기하되 존댓말로 이야기해야 돼. 말 끝마다 노란색 표정의 이모티콘을 넣어.",
      },
      ...prompt,
      {
        role: "user",
        content: messageData.message_text,
      },
    ],
    tools,
  });
  if (response.choices[0].message.tool_calls) {
    console.log(response.choices[0].message.tool_calls[0].function);
    const toolCall = response.choices[0].message.tool_calls[0];
    const parameter = Object.values(JSON.parse(toolCall.function.arguments))[0];
    console.log("파라미터 : ", parameter);
    if (typeof serverAPIfunctions[toolCall.function.name] === "function") {
      serverAPIfunctions[toolCall.function.name](parameter);
    } else {
      serverAPIfunctions["sendChat"]("function Name error!");
    }
  } else {
    serverAPIfunctions["sendChat"](response.choices[0].message.content);
  }
}
