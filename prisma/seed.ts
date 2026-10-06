// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash('@dm1n1234', 10)

    // Usamos upsert buscando por username
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',      // <-- Ahora el acceso será con este usuario
            password: hashedPassword,
            name: 'Enoc Salomon Salazar Ortega',
            dni: '12345678',        // Recuerda poner tu DNI real
            phone: '999888777',     // Tu número real
            role: 'ADMIN',
        },
    })

    console.log('✅ Base de datos inicializada.')
    console.log('👤 Administrador creado con usuario:', admin.username)
}

main()
    .catch((e) => {
        console.error('❌ Error ejecutando el seed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })