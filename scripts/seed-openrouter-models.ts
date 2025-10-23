import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function seedOpenRouterModels() {
  console.log('🌱 Seeding OpenRouter models...');

  const openRouterModels = [
    {
      name: 'meta-llama/llama-3.1-8b-instruct:free',
      label: 'Llama 3.1 8B Instruct (Free)',
      priority: 10,
    },
    {
      name: 'meta-llama/llama-3.1-70b-instruct',
      label: 'Llama 3.1 70B Instruct',
      priority: 9,
    },
    {
      name: 'anthropic/claude-3.5-sonnet',
      label: 'Claude 3.5 Sonnet',
      priority: 8,
    },
    {
      name: 'openai/gpt-4o',
      label: 'GPT-4o',
      priority: 7,
    },
    {
      name: 'openai/gpt-4o-mini',
      label: 'GPT-4o Mini',
      priority: 6,
    },
    {
      name: 'mistralai/mistral-7b-instruct:free',
      label: 'Mistral 7B Instruct (Free)',
      priority: 5,
    },
    {
      name: 'qwen/qwen-2.5-7b-instruct:free',
      label: 'Qwen 2.5 7B Instruct (Free)',
      priority: 4,
    },
    {
      name: 'google/gemini-pro-1.5',
      label: 'Gemini Pro 1.5',
      priority: 3,
    },
  ];

  for (const model of openRouterModels) {
    try {
      await prisma.aiModel.upsert({
        where: {
          provider_name: {
            provider: 'openrouter',
            name: model.name,
          },
        },
        update: {
          label: model.label,
          priority: model.priority,
          active: true,
        },
        create: {
          provider: 'openrouter',
          name: model.name,
          label: model.label,
          priority: model.priority,
          active: true,
        },
      });
      console.log(`✅ Added/Updated: ${model.label}`);
    } catch (error) {
      console.error(`❌ Failed to add ${model.label}:`, error);
    }
  }

  console.log('🎉 OpenRouter models seeded successfully!');
}

async function main() {
  try {
    await seedOpenRouterModels();
  } catch (error) {
    console.error('❌ Error seeding OpenRouter models:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { seedOpenRouterModels };
