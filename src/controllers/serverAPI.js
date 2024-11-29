import axios from "axios";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import { io } from "socket.io-client";
import { mqttClient } from "../index.js";

const commandtopic = "test/command";
dayjs.extend(duration);

//시간 객체를 문자열로 변환
function millisecondsToString(usedTime) {
  // 각각의 단위를 추출
  const years = usedTime.$d.years;
  const months = usedTime.$d.months;
  const days = usedTime.$d.days;
  const hours = usedTime.$d.hours;
  const minutes = usedTime.$d.minutes;
  // 문자열 생성
  return [
    years ? `${years}년` : "",
    months ? `${months}개월` : "",
    days ? `${days}일` : "",
    hours ? `${hours}시간` : "",
    minutes ? `${minutes}분` : "",
  ]
    .filter(Boolean) // 빈 문자열 제거
    .join(" ");
}

export async function getPortsUsedFor(minutes) {
  try {
    const response = await axios.get("http://localhost:3000/api/ports");
    const outletresponse = await axios.get("http://localhost:3000/api/outlets");
    const ports = response.data;
    const outlets = outletresponse.data;
    let inputTime = "";
    inputTime = millisecondsToString(dayjs.duration(minutes, "minutes"));
    const overTimePorts = ports.filter((data) => {
      const now = dayjs();
      const startedAt = dayjs(data.port_started_at);
      const usedTime = dayjs.duration(now.diff(startedAt));
      if (usedTime.$ms > minutes * 60 * 1000 && data.port_is_on) {
        millisecondsToString(usedTime);
        return true;
      } else return false;
    });
    //console.log(overTimePorts);

    const socket = io("http://localhost:3000");
    if (overTimePorts.length != 0) {
      let msg = overTimePorts.map((port) => {
        const now = dayjs();
        const startedAt = dayjs(port.port_started_at);
        const usedTime = dayjs.duration(now.diff(startedAt));
        return `
포트 이름: ${port.port_name ?? "포트 #" + port.port_id}
위치: ${
          outlets.find((outlet) => outlet.outlet_id === port.outlet_id)
            .outlet_name ?? "콘센트 #" + port.outlet_id
        } 콘센트 ${port.port_position}번
사용 시간: ${millisecondsToString(usedTime)}`;
      }).join(`
     
      `);

      const message = {
        message_text:
          `사용시간이 ${inputTime} 이상인 포트 목록이에요.😊
      ` + msg,
        message_is_user: 0,
      };
      socket.emit("chat message", message); // 서버로 메시지 전송
    } else {
      const message = {
        message_text: `사용시간이 ${inputTime} 이상인 포트가 없어요. 😊`,
        message_is_user: 0,
      };
      socket.emit("chat message", message);
    }
  } catch (error) {
    console.error("getPortsUsedFor error 😭 : ", error.message);
  }
}

export async function getHighRiskPorts() {
  try {
    const response = await axios.get("http://localhost:3000/api/ports");
    const outletresponse = await axios.get("http://localhost:3000/api/outlets");
    const ports = response.data;
    const outlets = outletresponse.data;
    const highRiskPorts = ports.filter((data) => {
      //위험도가 높고, 켜져있는 포트만 필터링
      if (data.port_risk_level === "상" && data.port_is_on === 1) {
        return true;
      } else return false;
    });
    const socket = io("http://localhost:3000");
    if (highRiskPorts.length != 0) {
      let msg = highRiskPorts.map((port) => {
        const now = dayjs();
        const startedAt = dayjs(port.port_started_at);
        const usedTime = dayjs.duration(now.diff(startedAt));
        return `
포트 이름: ${port.port_name ?? "포트 #" + port.port_id}
위치: ${
          outlets.find((outlet) => outlet.outlet_id === port.outlet_id)
            .outlet_name ?? "콘센트 #" + port.outlet_id
        } 콘센트 ${port.port_position}번
최대 사용 시간: ${port.port_limit_min}분
사용 시간: ${millisecondsToString(usedTime)}`;
      }).join(`
     
      `);

      const message = {
        message_text:
          `현재 사용중인 주의해야 할 포트 목록이에요. 😊
      ` + msg,
        message_is_user: 0,
        //message_item_id: 4,
        //message_item_type: "outlet",
      };
      socket.emit("chat message", message); // 서버로 메시지 전송
    } else {
      const message = {
        message_text: `위험도가 높은 포트가 없어요. 😊`,
        message_is_user: 0,
      };
      socket.emit("chat message", message);
    }
  } catch (error) {
    console.error("getHighRiskPorts error : ", error.message);
  }
}

export async function getPortByName(name) {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/ports?port_name=${name}`
    );
    const port = response.data[0];
    const outletresponse = await axios.get("http://localhost:3000/api/outlets");
    const outlets = outletresponse.data;
    const socket = io("http://localhost:3000");
    if (port.port_is_on == 1) {
      //켜져 있으면
      const now = dayjs();
      const startedAt = dayjs(port.port_started_at);
      const usedTime = dayjs.duration(now.diff(startedAt));

      let msg = `${port.port_name}는 사용중이에요.
위치: ${
        outlets.find((outlet) => outlet.outlet_id === port.outlet_id)
          .outlet_name ?? "콘센트 #" + port.outlet_id
      } 콘센트 ${port.port_position}번 ${
        port.port_limit_min == null
          ? ""
          : `
최대 사용 시간: ${port.port_limit_min}분`
      }
사용 시간: ${millisecondsToString(usedTime)}`;
      const message = {
        message_text: msg,
        message_is_user: 0,
      };

      socket.emit("chat message", message); // 서버로 메시지 전송
    } else {
      let msg = `${port.port_name}은 현재 사용하고 있지 않아요. 😊`;
      const message = {
        message_text: msg,
        message_is_user: 0,
      };

      socket.emit("chat message", message); // 서버로 메시지 전송
    }
  } catch (error) {
    console.error("getPortByName error 😭 : ", error.message);
  }
}

export async function sendChat(chat) {
  try {
    const socket = io("http://localhost:3000");
    const message = {
      message_text: chat,
      message_is_user: 0,
    };
    socket.emit("chat message", message);
  } catch (error) {
    console.error("sendChat error : ", error.message);
  }
}

export async function startInspection() {
  try {
    mqttClient.publish("test/command", "auto");
    const socket = io("http://localhost:3000");
    const message = {
      message_text: "점검을 시작할게요.😊",
      message_is_user: 0,
    };
    socket.emit("chat message", message);
  } catch (error) {
    console.error("startInspection error : ", error.message);
  }
}
