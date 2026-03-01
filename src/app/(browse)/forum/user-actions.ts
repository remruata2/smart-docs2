'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/prisma'

export async function checkUserActiveStatus() {
    const session = await getServerSession(authOptions)
    if (!session?.user) return false

    const userId = Number((session.user as any).id)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { is_active: true }
    })

    return user?.is_active ?? false
}
