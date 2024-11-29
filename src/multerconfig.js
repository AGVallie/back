import multer from "multer";
import path from "path";
import fs from "fs";

// 업로드 폴더 설정
const uploadFolder = "public/uploads";
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder); // 업로드 폴더 생성
}

// Multer 저장소 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

// 파일 필터 설정
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const isValidExtension = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const isValidMime = allowedTypes.test(file.mimetype);

  if (isValidExtension && isValidMime) {
    cb(null, true); // 허용된 파일 형식
  } else {
    cb(new Error("이미지 파일만 업로드 가능합니다."));
  }
};

// Multer 미들웨어 생성
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 크기 제한
  fileFilter,
});

// upload 객체 내보내기
export default upload;
