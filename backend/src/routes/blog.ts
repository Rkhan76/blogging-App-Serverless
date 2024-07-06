import { Hono } from 'hono'
import { Prisma, PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'
import { createBlogInput,updateBlogInput } from '@rkhan76/common-zod'

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  }
  Variables: {
    userId: string
  }
}>()

//middleware to verify token and put userId into request
blogRouter.use('/*', async (c, next) => {
  const authHeader = c.req.header('authorization') || ''
  const user = (await verify(authHeader, c.env.JWT_SECRET)) as { id: string }
  if (user) {
    c.set('userId', user.id)
    await next()
  } else {
    c.status(403)
    return c.json({
      message: 'you are not logged in',
    })
  }
})

blogRouter.post('/', async (c) => {
  try{
    const body = await c.req.json()
    const { success } = createBlogInput.safeParse(body)
    if (!success) {
      c.status(411)
      return c.json({
        message: 'Input not correct',
      })
    }
  const autherId = c.get('userId')
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate())

  const blog = await prisma.post.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: Number(autherId),
    },
  })

  return c.json({
    id: blog.id,
  })
  }catch(error){
    c.status(411)
    return c.json({
      message: "Error while create blog post"
    })
  }
})

blogRouter.put('/', async (c) => {
  try{
const body = await c.req.json()
const { success } =  updateBlogInput.safeParse(body)
if(!success){
  c.status(411)
  return c.json({
    message: "Input not correct"
  })
}
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate())

  const blog = await prisma.post.update({
    where: {
      id: body.id,
    },
    data: {
      title: body.title,
      content: body.content,
    },
  })

  return c.json({
    id: blog.id,
  })
  }catch(error){
  c.status(411)
  return c.json({
    message: "Error while updating blog post"
  })
}

})

//pagination
blogRouter.get('/bulk', async (c) => {
 try{
   const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate())

  const blog = await prisma.post.findMany()

  return c.json({
    blog,
  })
 }catch(error){
  c.status(411)
  return c.json({
    message: "Error while fetching blog post"
  })
 }
}) 

blogRouter.get('/:id', async (c) => {
  try {
    const id = await c.req.param("id")
    const prisma = new PrismaClient({
      datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate())

    const blog = await prisma.post.findFirst({
      where: {
        id: Number(id),
      },
    })

    return c.json({
      blog,
    })
  } catch (error) {
    c.status(411)
    return c.json({
      message: 'Error while fetching blog post',
    })
  }
})


