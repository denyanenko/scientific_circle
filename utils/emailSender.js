const transporter = require("../config/email");

const sendAcceptanceEmail = async (recipientEmail) => {
    const mailOptions = {
        from: `"Науковий гурток" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: 'Ваша заявка прийнята',
        text: 'Вітаємо! Ваша заявка на сайті наукового гуртка була успішно прийнята. Тепер ви маєте доступ до системи.',
    };

    await transporter.sendMail(mailOptions);
};

const sendRejectionEmail = async (recipientEmail) => {
    const mailOptions = {
        from: `"Науковий гурток" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: 'Ваша заявка відхилена',
        text: 'На жаль, ваша заявка на сайті наукового гуртка була відхилена. Якщо ви вважаєте це помилкою, зв’яжіться з адміністрацією гуртка.',
    };

    await transporter.sendMail(mailOptions);
};

const sendResetPasswordEmail = async (recipientEmail, resetLink) => {
    const mailOptions = {
        from: `"Науковий гурток" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: 'Відновлення пароля',
        html: `<p>Щоб скинути пароль, натисніть <a href="${resetLink}">це посилання</a>. Воно дійсне протягом 1 години.</p>`
    };

    await transporter.sendMail(mailOptions);
};

const sendInviteEmail = async (recipientEmail, inviteLink) => {
    const mailOptions = {
        from: `"Науковий гурток" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: 'Запрошення до системи',
        html: `<p>Щоб прийняти запрошення, натисніть <a href="${inviteLink}">це посилання</a>. Воно дійсне протягом 24 годин.</p>`
    };

    await transporter.sendMail(mailOptions);
};

module.exports = {
    sendAcceptanceEmail,
    sendRejectionEmail,
    sendResetPasswordEmail,
    sendInviteEmail
};
