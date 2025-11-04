function otpTemplate({ otp, minutes }) {
  return {
    subject: `Your TravoSphere OTP (${otp})`,
    text: `Your TravoSphere login OTP is ${otp}. It expires in ${minutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.5;">
        <h2>TravoSphere</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <h1 style="letter-spacing:4px;">${otp}</h1>
        <p>This OTP will expire in <strong>${minutes} minutes</strong>.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <hr/>
        <small>TravoSphere Team</small>
      </div>
    `
  };
}

module.exports = otpTemplate;
