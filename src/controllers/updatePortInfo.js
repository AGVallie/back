import axios from "axios";
import { io } from "socket.io-client";
import { currentArea } from "../index.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

let isSended = 0;
const colorConversion = {
  w: `bg-white`,
  b: `bg-black`,
  p: `bg-pink-300`,
};
const sizeConversion = {
  w: `rounded-xl w-6 h-10`,
  b: `rounded-full w-8 h-6`,
  p: `rounded-full w-8 h-6`,
};

const colorToOutletId = {
  o: 0,
  y: 1,
  r: 2,
  b: 3,
  p: 4,
  g: 5,
};

export function convertDateFormat(date) {
  dayjs.extend(utc);
  if (date === null) {
    return undefined;
  }
  return dayjs(date).local().format("YYYY-MM-DD HH:mm:ss");
}

export async function compareData(message) {
  try {
    const parsedArray = message
      .toString()
      .split(",")
      .map((item) => item.replace(/^'|'$/g, ""));
    const parsedData = {
      roomColor: parsedArray[0],
      isOn: parsedArray[1].split(" ").map((value) => parseInt(value, 10)),
      portColor: parsedArray[2].split(" "),
    };
    const outletLength =
      parsedData.isOn.length === parsedData.portColor.length
        ? parsedData.isOn.length
        : 0;
    if (outletLength === 0) {
      console.log("콘센트 포트 개수가 0개입니다.");
      return;
    }
    const areaId = colorToOutletId[parsedData.roomColor];
    if (areaId === undefined) {
      console.log("유효하지 않은 방 색깔입니다.");
      return;
    }

    const areaResponse = await axios.get(
      `http://localhost:3000/api/areawithoutlets?area_id=${areaId}`
    );

    const targetOutlet = areaResponse.data.outlets.find(
      (el) => el.outlet_port_count === outletLength
    );
    if (targetOutlet === undefined) {
      console.log("매치되는 콘센트를 찾을 수 없습니다.");
      return;
    }
    //콘센트 점검시간 갱신
    updateCheckedAt(targetOutlet);
    for (let portPos = 0; portPos < outletLength; portPos++) {
      if (parsedData.isOn[portPos]) {
        //뭔가 꽂혀있을때
        if (
          targetOutlet.ports.find((port) => port.port_position === portPos) ===
          undefined
        ) {
          //그전에 꽂혀있지 않았을때
          createNewPort(portPos, targetOutlet.outlet_id, parsedData);
        } else {
          //그전에 꽂혀있을때
          if (
            colorConversion[parsedData.portColor[portPos]] ===
            targetOutlet.ports.find((port) => port.port_position === portPos)
              .port_color
          ) {
            //색깔이 같을때 아무것도안함
          } else {
            //색깔이 다를때 업데이트해야함(기존 포트 제거, 새로운 포트 추가)
            updateNewPort(
              targetOutlet.ports.find((port) => port.port_position === portPos),
              portPos,
              targetOutlet.outlet_id,
              parsedData
            );
          }
        }
      } else {
        //꽂혀 있지 않을때

        if (
          targetOutlet.ports.find((port) => port.port_position === portPos) ===
          undefined
        ) {
          //꽂혀 있지 않을때 아무것도안함
        } else {
          //그전에 꽂혀있었을때
          turnOffPort(
            targetOutlet.ports.find((port) => port.port_position === portPos)
          );
        }
      }
    }
    isSended = 0;
  } catch (error) {
    console.log("compareData error : ", error.message);
  }
}

async function updateCheckedAt(targetOutlet) {
  try {
    console.log("콘센트 점검 시간 갱신");
    const response = await axios.patch(
      `http://localhost:3000/api/outlets?outlet_id=${targetOutlet.outlet_id}`,
      {
        outlet_checked_at: dayjs().local().format("YYYY-MM-DD HH:mm:ss"),
      }
    );
  } catch (error) {
    console.log("updateCheckedAt error : ", error.mesage);
  }
}

async function turnOffPort(port) {
  try {
    console.log("콘센트에서 분리된 포트를 발견했습니다.");
    const updates = {
      ...port,
      port_created_at: convertDateFormat(port.port_created_at),
      port_started_at: convertDateFormat(port.port_started_at),
      port_ended_at: convertDateFormat(port.port_ended_at),
      port_position: null,
      outlet_id: null,
      port_is_on: 0,
    };
    const response = await axios.patch(
      `http://localhost:3000/api/ports?port_id=${port.port_id}`,
      updates
    );
  } catch (error) {
    console.log("turnOffPort error : ", error.message);
  }
}

async function createNewPort(portPos, outletId, parsedData) {
  try {
    dayjs.extend(utc);
    console.log("콘센트에서 새로운 기기를 발견했습니다.");
    const areaResponse = await axios.get(
      `http://localhost:3000/api/areawithoutlets?area_id=${
        colorToOutletId[parsedData.roomColor]
      }`
    );
    const socket = io("http://localhost:3000");
    const areaName =
      areaResponse.data.area_name ?? `방 #${areaResponse.data.area_id + 1}`;
    const outletName =
      areaResponse.data.outlets.find((el) => el.outlet_id === outletId)
        .outlet_name ?? `멀티탭 #${outletId}`;
    const portNum = portPos;

    const newPort = {
      outlet_id: outletId,
      port_position: portNum,
      port_risk_level: "하",
      port_started_at: dayjs().local().format("YYYY-MM-DD HH:mm:ss"),
      port_ended_at: undefined,
      port_limit_min: undefined,
      port_name: undefined,
      port_color: colorConversion[parsedData.portColor[portNum]],
      port_shape: sizeConversion[parsedData.portColor[portNum]],
      port_is_on: 1,
    };
    await axios.post(`http://localhost:3000/api/ports`, newPort);
    if (isSended === 0) {
      isSended = 1;
      const newPortForm = {
        message_text: `${
          areaName ?? area_id
        }에 있는 ${outletName}에 새로운 기기가 발견되었어요. 😊`,
        message_is_user: 0,
        message_item_id: outletId,
        message_item_type: "outlet",
      };
      socket.emit("chat message", newPortForm);
    }
  } catch (error) {
    console.log("createNewPort error : ", error.message);
  }
}

async function updateNewPort(port, portPos, outletId, parsedData) {
  turnOffPort(port);
  createNewPort(portPos, outletId, parsedData);
}
