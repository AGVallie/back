import express from "express";
import mysql from "mysql2/promise";
import "dotenv/config";
import db from "./dbConnection.js";
const router = express.Router();

// 허용된 테이블과 컬럼 설정
const ALLOWED_TABLES = [
  "outlets",
  "ports",
  "messages",
  "devices",
  "routines",
  "areas",
  "areawithoutlets",
  "outletwithports",
];

/**
 * @swagger
 * /api/{table}:
 *   get:
 *     summary: 특정 테이블의 데이터를 조회
 *     description: 쿼리 파라미터에 맞는 데이터를 반환하거나, 쿼리 파라미터가 없으면 전체 데이터를 반환합니다.
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         description: 조회할 테이블 이름
 *         schema:
 *           type: string
 *           enum: [outlets, ports, messages, devices, routines,areas,areawithoutlets,outletwithports]
 *       - in: query
 *         name: filter
 *         required: false
 *         description: 필터링에 사용할 컬럼과 값을 쿼리 파라미터로 지정합니다.
 *         schema:
 *           type: object
 *           additionalProperties:
 *             type: string
 *     responses:
 *       200:
 *         description: 조회된 데이터
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: 잘못된 테이블 이름 또는 파라미터
 *       500:
 *         description: 데이터베이스 쿼리 실패
 */

router.get("/:table", async (req, res) => {
  const { table } = req.params;
  const queryParams = req.query;

  // 유효한 테이블 확인
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: "Invalid table name" });
  }

  // areawithoutlets 요청 처리
  if (table === "areawithoutlets") {
    const { area_id } = queryParams;

    // 쿼리 파라미터가 없으면 전체 데이터를 가져오는 쿼리 실행
    if (Object.keys(queryParams).length === 0) {
      // area_id가 없을 때 전체 계층 데이터 반환
      const [areas] = await db.execute("SELECT * FROM areas");
      const [outlets] = await db.execute("SELECT * FROM outlets");
      const [ports] = await db.execute("SELECT * FROM ports");

      // 계층 데이터 구조화
      const areasWithHierarchy = areas.map((area) => {
        const areaOutlets = outlets.filter(
          (outlet) => outlet.outlet_area_id === area.area_id
        );
        const areaOutletsWithPorts = areaOutlets.map((outlet) => ({
          ...outlet,
          ports: ports.filter((port) => port.outlet_id === outlet.outlet_id),
        }));
        return {
          ...area,
          outlets: areaOutletsWithPorts,
        };
      });

      return res.json(areasWithHierarchy);
    }

    try {
      // 1. 특정 area 가져오기
      const [areas] = await db.execute(
        "SELECT * FROM areas WHERE area_id = ?",
        [area_id]
      );
      if (areas.length === 0) {
        return res.status(404).json({ error: "Area not found" });
      }
      const area = areas[0];

      // 2. 관련 outlets 가져오기
      const [outlets] = await db.execute(
        "SELECT * FROM outlets WHERE outlet_area_id = ?",
        [area_id]
      );
      // 3. 관련 ports 가져오기
      const outletIds = outlets.map((outlet) => outlet.outlet_id);
      let ports = [];
      if (outletIds.length > 0) {
        const queryPlaceholders = outletIds.map(() => "?").join(",");
        [ports] = await db.execute(
          `SELECT * FROM ports WHERE outlet_id IN (${queryPlaceholders})`,
          outletIds
        );
      }
      // 4. 계층 데이터 생성
      const outletsWithPorts = outlets.map((outlet) => ({
        ...outlet,
        ports: ports.filter((port) => port.outlet_id == outlet.outlet_id),
      }));

      const response = {
        ...area,
        outlets: outletsWithPorts,
      };

      return res.json(response);
    } catch (error) {
      console.error("Database error:", error);
      return res
        .status(500)
        .json({ error: "Failed to retrieve hierarchical data" });
    }
  }

  if (table === "outletwithports") {
    const { outlet_id } = queryParams;

    try {
      if (outlet_id) {
        // 특정 outlet_id에 대한 데이터와 관련 ports 반환
        const [outlets] = await db.execute(
          "SELECT * FROM outlets WHERE outlet_id = ?",
          [outlet_id]
        );
        if (outlets.length === 0)
          return res.status(404).json({ error: "Outlet not found" });
        const outlet = outlets[0];

        const [ports] = await db.execute(
          "SELECT * FROM ports WHERE outlet_id = ?",
          [outlet_id]
        );

        outlet.ports = ports; // 계층 데이터 연결
        return res.json(outlet);
      } else {
        // 전체 outlets와 관련 ports 반환
        const [outlets] = await db.execute("SELECT * FROM outlets");
        const [ports] = await db.execute("SELECT * FROM ports");

        // 각 outlet에 해당 ports 연결
        const outletsWithPorts = outlets.map((outlet) => ({
          ...outlet,
          ports: ports.filter((port) => port.outlet_id === outlet.outlet_id),
        }));

        return res.json(outletsWithPorts);
      }
    } catch (error) {
      console.log("Database error : ", error);
    }
  }

  // 쿼리 파라미터가 없으면 전체 데이터를 가져오는 쿼리 실행
  if (Object.keys(queryParams).length === 0) {
    try {
      const [rows] = await db.execute(`SELECT * FROM \`${table}\``); // 전체 데이터 조회
      return res.json(rows);
    } catch (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Database query failed" });
    }
  }

  // 쿼리 파라미터의 key와 value를 동적으로 쿼리에 반영
  const column = Object.keys(queryParams)[0];
  const value = queryParams[column];

  try {
    const [rows] = await db.execute(
      `SELECT * FROM \`${table}\` WHERE \`${column}\` = ?`,
      [value]
    );
    res.json(rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

/**
 * @swagger
 * /api/{table}:
 *   post:
 *     summary: 새로운 항목을 특정 테이블에 추가
 *     description: 요청 본문에 제공된 데이터를 특정 테이블에 추가합니다.
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         description: 테이블 이름
 *         schema:
 *           type: string
 *           enum: [outlets, ports, messages, devices, routines,areas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties:
 *               type: string
 *     responses:
 *       201:
 *         description: 항목이 성공적으로 추가됨
 *       400:
 *         description: 잘못된 테이블 이름 또는 요청 본문 형식 오류
 *       500:
 *         description: 데이터베이스 쿼리 실패
 */
router.post("/:table", async (req, res) => {
  const { table } = req.params;
  const data = req.body;

  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: "Invalid table name" });
  }

  try {
    const columns = Object.keys(data).join(", ");
    const values = Object.values(data)
      .map((value) => `'${value}'`)
      .join(", ");

    const query = `INSERT INTO \`${table}\` (${columns}) VALUES (${values})`;
    const insertId = (await db.execute(query))[0].insertId;

    res
      .status(201)
      .json({ message: "Resource created successfully", insertId });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

/**
 * @swagger
 * /api/{table}:
 *   delete:
 *     summary: 특정 항목을 삭제
 *     description: 쿼리 파라미터로 특정 항목을 찾고, 해당 데이터를 삭제합니다. 여러 컬럼을 이용한 필터링도 가능합니다.
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         description: 테이블 이름
 *         schema:
 *           type: string
 *           enum: [outlets, ports, messages, devices, routines,areas]
 *       - in: query
 *         name: filters
 *         required: false
 *         description: 필터링에 사용할 컬럼과 값을 쿼리 파라미터로 지정합니다.
 *         schema:
 *           type: object
 *           additionalProperties:
 *             type: string
 *     responses:
 *       200:
 *         description: 항목이 성공적으로 삭제됨
 *       400:
 *         description: 잘못된 테이블 이름 또는 필터링 파라미터 오류
 *       500:
 *         description: 데이터베이스 쿼리 실패
 */
router.delete("/:table", async (req, res) => {
  const { table } = req.params;
  const queryParams = req.query;

  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: "Invalid table name" });
  }

  if (Object.keys(queryParams).length === 0) {
    return res
      .status(400)
      .json({ error: "Column and value query parameters are required" });
  }
  const column = Object.keys(queryParams)[0];
  const value = queryParams[column];

  try {
    const query = `DELETE FROM \`${table}\` WHERE \`${column}\` = ?`;
    await db.execute(query, [value]);

    res.status(200).json({ message: "Resource deleted successfully" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

/**
 * @swagger
 * /api/{table}:
 *   patch:
 *     summary: 특정 항목을 수정
 *     description: 쿼리 파라미터로 특정 항목을 찾고, 본문 데이터를 수정합니다. 여러 컬럼을 이용한 필터링도 가능합니다.
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         description: 테이블 이름
 *         schema:
 *           type: string
 *           enum: [outlets, ports, messages, devices, routines,areas]
 *       - in: query
 *         name: filters
 *         required: false
 *         description: 필터링에 사용할 컬럼과 값을 쿼리 파라미터로 지정합니다.
 *         schema:
 *           type: object
 *           additionalProperties:
 *             type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties:
 *               type: string
 *     responses:
 *       200:
 *         description: 항목이 성공적으로 수정됨
 *       400:
 *         description: 잘못된 테이블 이름 또는 필터링 파라미터 오류
 *       500:
 *         description: 데이터베이스 쿼리 실패
 */

router.patch("/:table", async (req, res) => {
  const { table } = req.params;
  const queryParams = req.query;
  const data = req.body;

  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: "Invalid table name" });
  }

  if (Object.keys(queryParams).length === 0) {
    //파라미터가 없을때
    if (!Array.isArray(data)) {
      return res
        .status(400)
        .json({ error: "Request body must be an array of objects" });
    }
    if (table === "ports") {
      try {
        for (const record of data) {
          const id = record.port_id; // 각 레코드에 고유 식별자가 있다고 가정
          if (!id) {
            return res
              .status(400)
              .json({ error: "Each record must include an 'port_id' field" });
          }

          const setClause = Object.keys(record)
            .filter((key) => key !== "port_id") // `id` 필드는 업데이트에 사용하지 않음
            .map((key) => `\`${key}\` = ?`)
            .join(", ");
          const values = Object.keys(record)
            .filter((key) => key !== "port_id")
            .map((key) => record[key]);

          const query = `UPDATE \`${table}\` SET ${setClause} WHERE \`port_id\` = ?`;
          values.push(id); // 조건 값 추가

          await db.execute(query, values); // 반복적으로 쿼리 실행
        }

        res.status(200).json({ message: "Resources updated successfully" });
      } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Database query failed" });
      }
      return;
    }
  }
  const column = Object.keys(queryParams)[0];
  const value = queryParams[column];

  try {
    const setClause = Object.keys(data)
      .map((key) => `\`${key}\` = ?`)
      .join(", ");
    const values = Object.values(data);

    const query = `UPDATE \`${table}\` SET ${setClause} WHERE \`${column}\` = ?`;
    values.push(value); // `column`에 해당하는 `value`를 조건으로 추가
    await db.execute(query, values);

    res.status(200).json({ message: "Resource updated successfully" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

export default router;
