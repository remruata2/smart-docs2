require("dotenv").config();
const { PrismaClient } = require("../src/generated/prisma");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  try {
    // Default admin user credentials
    const username = "admin";
    const password = "Admin@123";
    const role = "admin"; // lowercase as per enum

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      console.log(`User with username ${username} already exists.`);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        username,
        password_hash: hashedPassword,
        role,
        is_active: true,
      },
    });

    console.log(
      `Created user with username: ${user.username} and role: ${user.role}`
    );
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
