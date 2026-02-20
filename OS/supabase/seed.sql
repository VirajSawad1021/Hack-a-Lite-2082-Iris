

insert into public.agora_profiles
  (type, name, tagline, description, sector, stage, team_size, location, founded_year, is_public, is_verified, follower_count, metrics)
values
  (
    'startup', 'Meridian AI', 'Revenue intelligence for modern sales teams',
    'Meridian AI analyzes sales calls, CRM data, and emails to surface actionable revenue insights in real time.',
    'SalesTech', 'series-a', 18, 'San Francisco, CA', 2022,
    true, true, 342,
    '{"arr": 1800000, "growth": 0.38, "nps": 72, "mrr": 150000}'::jsonb
  ),
  (
    'investor', 'Horizon Ventures', 'Backing the next generation of AI-native companies',
    'Horizon Ventures is a $120M seed-to-Series A fund focused exclusively on AI infrastructure and applied AI.',
    'AI / ML', 'growth', 12, 'New York, NY', 2019,
    true, true, 1240,
    '{"aum": 120000000, "portfolio_size": 34, "avg_check": 1500000}'::jsonb
  ),
  (
    'startup', 'FleetOps', 'Autonomous fleet management with predictive AI',
    'FleetOps reduces fleet downtime by 40% using predictive maintenance, route optimization, and driver coaching.',
    'LogisticsTech', 'seed', 9, 'Austin, TX', 2023,
    true, false, 89,
    '{"arr": 420000, "growth": 0.52, "fleets_managed": 47}'::jsonb
  ),
  (
    'startup', 'Cartographer', 'Turn customer data into product strategy',
    'We help product teams discover hidden usage patterns and auto-generate roadmap recommendations from behavioral data.',
    'ProductTech', 'series-a', 24, 'London, UK', 2021,
    true, true, 517,
    '{"arr": 3200000, "growth": 0.29, "customers": 210}'::jsonb
  ),
  (
    'investor', 'FoundersFirst Capital', 'Pre-seed conviction investing in B2B SaaS',
    'FoundersFirst writes first checks of $250K–$750K into B2B SaaS and vertical AI companies at the idea stage.',
    'B2B SaaS', 'seed', 6, 'Chicago, IL', 2021,
    true, false, 678,
    '{"aum": 40000000, "portfolio_size": 58, "avg_check": 500000}'::jsonb
  ),
  (
    'startup', 'Nexara Health', 'AI care coordinator for chronic disease management',
    'Nexara automates care coordination workflows for health systems, reducing readmissions by 28%.',
    'HealthTech', 'series-b', 61, 'Boston, MA', 2020,
    true, true, 891,
    '{"arr": 8500000, "growth": 0.19, "health_systems": 23}'::jsonb
  ),
  (
    'startup', 'Coda Finance', 'Real-time cash flow intelligence for startups',
    'Coda connects to your bank, payroll, and ERP to give a live view of burn, runway, and scenario planning.',
    'FinTech', 'seed', 7, 'Miami, FL', 2023,
    true, false, 156,
    '{"arr": 290000, "growth": 0.61, "connected_companies": 83}'::jsonb
  ),
  (
    'partner', 'Anthropic Partners', 'Enabling enterprise Claude deployments',
    'Official Anthropic partner for enterprise integrations, compliance frameworks, and custom model fine-tuning.',
    'AI Infrastructure', 'growth', 8, 'San Francisco, CA', 2023,
    true, true, 2100,
    '{"enterprise_deployments": 120, "avg_contract_size": 85000}'::jsonb
  );

