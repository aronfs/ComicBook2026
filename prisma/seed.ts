import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { slugify } from "../src/utils/slug";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@comicbook.local";
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD || "ChangeMe123*";

  const adminPasswordHash = await Bun.password.hash(adminPassword, {
    algorithm: "argon2id",
    memoryCost: 19456,
    timeCost: 2,
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      firstName: "Administrador",
      lastName: "Principal",
      username: "admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`✅ Administrador creado: ${admin.email}`);

  const comicTypesData = [
    { name: "Superhéroes" },
    { name: "Manga" },
    { name: "Ciencia ficción" },
    { name: "Fantasía" },
    { name: "Terror" },
    { name: "Aventura" },
    { name: "Comedia" },
    { name: "Drama" },
    { name: "Misterio" },
    { name: "Acción" },
  ];

  const comicTypes: Record<string, string> = {};
  for (const ct of comicTypesData) {
    const slug = slugify(ct.name);
    const created = await prisma.comicType.upsert({
      where: { slug },
      update: {},
      create: {
        name: ct.name,
        slug,
        description: `Cómics de tipo ${ct.name}`,
        isActive: true,
      },
    });
    comicTypes[ct.name] = created.id;
    console.log(`✅ Tipo de cómic: ${created.name}`);
  }

  if (process.env.NODE_ENV === "production") {
    console.log("⚠️  Entorno de producción: no se crean datos demo");
    return;
  }

  const demoComics = [
    {
      title: "El Guardián de la Ciudad",
      author: "Carlos Martínez",
      publisher: "Editorial Nova",
      publicationYear: 2025,
      description:
        "En una ciudad al borde del caos, un héroe solitario debe enfrentar sus demonios internos mientras protege a los inocentes.",
      synopsis:
        "Diego Torres, un ex policía con habilidades sobrehumanas, patrulla las calles de Neo Ciudad en busca de justicia. Cuando una organización criminal amenaza con destruir todo lo que ama, deberá decidir hasta dónde está dispuesto a llegar para salvar su ciudad.",
      type: "Superhéroes",
      isFeatured: true,
      availability: "AVAILABLE",
      totalPages: 48,
      language: "es",
      issueNumber: 1,
    },
    {
      title: "Rincones del Alma",
      author: "Yuki Tanaka",
      publisher: "Manga Press",
      publicationYear: 2024,
      description:
        "Una conmovedora historia sobre amistad, pérdida y redención en el Japón contemporáneo.",
      synopsis:
        "Haruki, un joven estudiante de arte, descubre un viejo cuaderno que perteneció a su abuela. A través de sus páginas, emprende un viaje para entender su pasado y encontrar su propio camino en el mundo.",
      type: "Manga",
      isFeatured: true,
      availability: "AVAILABLE",
      totalPages: 200,
      language: "es",
      issueNumber: 1,
    },
    {
      title: "Más Allá de las Estrellas",
      author: "Ana Romero",
      publisher: "Cosmos Ediciones",
      publicationYear: 2025,
      description:
        "Una épica aventura espacial donde la humanidad busca un nuevo hogar entre las estrellas.",
      synopsis:
        "Año 2157. La Tierra ya no es habitable. La nave colonial Esperanza viaja hacia un sistema solar lejano con los últimos supervivientes de la humanidad. Pero no todo está perdido: en su interior llevan la clave para un nuevo comienzo.",
      type: "Ciencia ficción",
      isFeatured: false,
      availability: "COMING_SOON",
      totalPages: 64,
      language: "es",
    },
    {
      title: "El Bosque de los Susurros",
      author: "Laura Jiménez",
      publisher: "Fantasía Editorial",
      publicationYear: 2024,
      description:
        "En un bosque mágico, una niña descubre que los árboles guardan secretos milenarios.",
      synopsis:
        "Lucía encuentra un portal hacia un bosque encantado donde las criaturas hablan y los árboles guardan memorias. Deberá ayudar a sus nuevos amigos a proteger el bosque de una amenaza oscura.",
      type: "Fantasía",
      isFeatured: false,
      availability: "AVAILABLE",
      totalPages: 36,
      language: "es",
    },
    {
      title: "Noche de Pánico",
      author: "Roberto Sánchez",
      publisher: "Terror Oscuro",
      publicationYear: 2025,
      description:
        "Una noche de tormenta, un grupo de amigos se refugia en una mansión abandonada donde nada es lo que parece.",
      synopsis:
        "Cinco amigos quedan atrapados en una mansión victoriana durante una tormenta. Pronto descubren que no están solos. Algo se esconde en las sombras, y está hambriento.",
      type: "Terror",
      isFeatured: false,
      availability: "AVAILABLE",
      totalPages: 32,
      language: "es",
    },
    {
      title: "El Tesoro del Dragón Dorado",
      author: "Miguel Ángel Ruiz",
      publisher: "Aventura Gráfica",
      publicationYear: 2024,
      description:
        "Una búsqueda del tesoro alrededor del mundo llena de peligros y descubrimientos.",
      synopsis:
        "La arqueóloga Elena Torres y su equipo viajan por el mundo siguiendo las pistas de un legendario tesoro. Pero no son los únicos: una organización secreta hará todo lo posible por llegar primero.",
      type: "Aventura",
      isFeatured: true,
      availability: "AVAILABLE",
      totalPages: 56,
      language: "es",
      issueNumber: 3,
    },
    {
      title: "Risas en la Oficina",
      author: "Pedro García",
      publisher: "Comic humor",
      publicationYear: 2025,
      description:
        "Las desventuras cómicas de un empleado en una oficina llena de personajes excéntricos.",
      synopsis:
        "Pablo comienza a trabajar en una empresa donde nada tiene sentido. Entre jefes absurdos, compañeros peculiares y situaciones imposibles, descubrirá que la mejor manera de sobrevivir es reírse de todo.",
      type: "Comedia",
      isFeatured: false,
      availability: "AVAILABLE",
      totalPages: 28,
      language: "es",
    },
    {
      title: "Lágrimas de Cristal",
      author: "Sofía Mendoza",
      publisher: "Drama Editores",
      publicationYear: 2024,
      description:
        "Una historia profunda sobre el duelo, la esperanza y la capacidad de sanar.",
      synopsis:
        "Después de perder a su hermana, Valeria lucha por encontrar un propósito. En su viaje de sanación, descubre que el amor nunca desaparece realmente, solo se transforma.",
      type: "Drama",
      isFeatured: true,
      availability: "AVAILABLE",
      totalPages: 72,
      language: "es",
    },
    {
      title: "El Enigma del Relojero",
      author: "Felipe Torres",
      publisher: "Misterio Editorial",
      publicationYear: 2025,
      description:
        "Un detective deberá resolver el misterio de un relojero que desaparece dejando solo pistas en sus relojes.",
      synopsis:
        "El detective privado Martín Rivas recibe un caso inusual: un famoso relojero ha desaparecido, dejando tras de sí una serie de relojes que contienen mensajes cifrados. Cada reloj es una pieza de un rompecabezas mortal.",
      type: "Misterio",
      isFeatured: false,
      availability: "AVAILABLE",
      totalPages: 44,
      language: "es",
      issueNumber: 2,
    },
    {
      title: "Ruta de Fuego",
      author: "Diana Bravo",
      publisher: "Acción Directa",
      publicationYear: 2025,
      description:
        "Una agente encubierta se infiltra en un cartel internacional en esta trepidante historia de acción.",
      synopsis:
        "La agente especial Valeria Soto se infiltra en el cartel más peligroso del mundo. Cuando su tapadera está a punto de ser descubierta, deberá usar todas sus habilidades para sobrevivir y completar la misión.",
      type: "Acción",
      isFeatured: false,
      availability: "AVAILABLE",
      totalPages: 40,
      language: "es",
    },
  ];

  for (const demo of demoComics) {
    const slug = slugify(demo.title);
    const existing = await prisma.comic.findUnique({ where: { slug } });

    if (!existing) {
      const typeId = comicTypes[demo.type];
      if (!typeId) {
        console.log(`⚠️  Tipo no encontrado para: ${demo.type}`);
        continue;
      }

      await prisma.comic.create({
        data: {
          title: demo.title,
          slug,
          description: demo.description,
          synopsis: demo.synopsis,
          author: demo.author,
          publisher: demo.publisher || null,
          publicationYear: demo.publicationYear,
          issueNumber: (demo as any).issueNumber || null,
          totalPages: demo.totalPages || null,
          language: demo.language || "es",
          coverImageUrl: null,
          comicTypeId: typeId,
          status: "PUBLISHED",
          availability: (demo.availability as any) || "AVAILABLE",
          isFeatured: demo.isFeatured || false,
          publishedAt: new Date(),
          createdById: admin.id,
        },
      });
      console.log(`✅ Cómic demo: ${demo.title}`);
    } else {
      console.log(`⏭️  Cómic ya existe: ${demo.title}`);
    }
  }

  console.log("🎉 Seed completado exitosamente");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
