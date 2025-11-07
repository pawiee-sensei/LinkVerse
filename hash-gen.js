import bcrypt from "bcrypt";

const password = "admin123";

const generateHash = async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log("Password:", password);
  console.log("Hash:", hash);
};

generateHash();
