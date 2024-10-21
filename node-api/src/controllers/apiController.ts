import { Request, Response } from 'express';
import { User } from '../models/User';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';

const generateRandomPassword = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        password += chars[randomIndex];
    }
    return password;
};

export const registerUser = async (req: Request, res: Response) => {
    const { email, password, name, discipline } = req.body;

    if (!email || !password || !name || !discipline) {
        console.warn('Dados incompletos fornecidos para registro.');
        return res.status(400).json({ error: 'E-mail, senha, nome e/ou disciplina não fornecidos.' });
    }

    try {
        console.log('Verificando se o usuário já existe...');
        const hasUser = await User.findOne({ where: { email } });
        if (hasUser) {
            console.warn(`Usuário com e-mail ${email} já existe.`);
            return res.status(409).json({ error: 'E-mail já existe.' });
        }

        console.log('Criando novo usuário...');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = await User.create({ email, password: hashedPassword, name, discipline });

        console.log('Usuário cadastrado com sucesso:', newUser);
        return res.status(201).json({ message: "Usuário cadastrado com sucesso.", newUser });
    } catch (error) {
        console.error('Erro ao cadastrar usuário: ', error);
        return res.status(500).json({ error: 'Erro interno ao processar o registro' });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.params;

    if (!email) {
        console.warn('E-mail não fornecido.');
        return res.status(400).json({ error: 'E-mail não fornecido.' });
    }

    try {
        console.log(`Buscando usuário com e-mail: ${email}...`);
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.warn(`Usuário com e-mail ${email} não encontrado.`);
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const randomPassword = generateRandomPassword(8);
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(randomPassword, saltRounds);

        user.password = hashedPassword;
        await user.save();
        console.log(`Senha aleatória gerada e armazenada para o usuário: ${email}`);

        // Configuração do transporte de e-mail
        const transporter = nodemailer.createTransport({
            host: 'sandbox.smtp.mailtrap.io',
            port: 2525,
            auth: {
                user: '3c06f9dbdde467',
                pass: 'b338ed92a62e61',
            },
        });

        const mailOptions = {
            from: 'seu-email@dominio.com',
            to: user.email,
            subject: 'Recuperação de senha',
            text: `Sua nova senha é: ${randomPassword}`,
        };

        transporter.sendMail(mailOptions, (error: any, info: { response: any; }) => {
            if (error) {
                console.error('Erro ao enviar o e-mail:', error);
                return res.status(500).json({ error: 'Ocorreu um erro ao enviar o e-mail.' });
            } else {
                console.log('E-mail enviado com sucesso:', info.response);
                return res.json({ message: 'Senha enviada por e-mail.' });
            }
        });
    } catch (error) {
        console.error('Erro ao processar a solicitação de recuperação de senha:', error);
        return res.status(500).json({ error: 'Ocorreu um erro ao processar a solicitação.' });
    }
};

// Considerações de segurança no README
// 1. Validar sempre as entradas do usuário para evitar injeções e ataques.
// 2. Utilizar HTTPS para garantir a segurança na transmissão de dados.
// 3. Implementar limitações de tentativas de login para prevenir ataques de força bruta.
// 4. Considerar o uso de CAPTCHA em formulários de registro e login.
