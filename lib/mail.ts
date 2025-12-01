import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
})

export async function sendVerificationEmail(email: string, token: string) {
  const info = await transporter.sendMail({
    from: `"NoteOL" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: "NoteOL 注册验证码",
    text: `您的验证码是：${token}。有效期为10分钟。`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0070f3;">NoteOL 注册验证</h2>
        <p>您好，</p>
        <p>您正在注册 NoteOL 账号。请输入以下验证码完成注册：</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
          ${token}
        </div>
        <p>该验证码有效期为 10 分钟。如果您没有请求此验证码，请忽略此邮件。</p>
      </div>
    `,
  })

  console.log("Message sent: %s", info.messageId)
  return info
}
