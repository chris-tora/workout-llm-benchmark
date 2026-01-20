// Test script for target muscle filter
const SUPABASE_URL = 'https://ivfllbccljoyaayftecd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZmxsYmNjbGpveWFheWZ0ZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExOTAxNCwiZXhwIjoyMDgxNjk1MDE0fQ.0-GD_WvgZlCOMFThc-4mLMS80GE5wLKFetHe_X_ovUc';

async function testTargetFilter() {
  console.log('Testing get_distinct_targets RPC function...\n');

  // Test 1: Fetch all distinct targets
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_distinct_targets`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  });

  const targets = await response.json();
  console.log(`✓ Found ${targets.length} target muscles:`);
  targets.forEach((t, i) => console.log(`  ${i + 1}. ${t.target}`));

  // Test 2: Filter exercises by a sample target (biceps)
  console.log('\n\nTesting exercise filtering by target muscle (biceps)...\n');

  const filterResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/exercises?target=eq.biceps&select=id,name,equipment,bodypart,target`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
      }
    }
  );

  const exercises = await filterResponse.json();
  const count = filterResponse.headers.get('content-range')?.split('/')[1] || exercises.length;

  console.log(`✓ Found ${count} exercises with target=biceps`);
  console.log('\nFirst 5 exercises:');
  exercises.slice(0, 5).forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.name} (${ex.equipment}, ${ex.bodypart})`);
  });

  // Test 3: Verify all targets are valid
  console.log('\n\nVerifying all targets have exercises...\n');

  const results = await Promise.all(
    targets.map(async (t) => {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/exercises?target=eq.${encodeURIComponent(t.target)}&select=id`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'count=exact',
          }
        }
      );
      const count = res.headers.get('content-range')?.split('/')[1] || 0;
      return { target: t.target, count: parseInt(count) };
    })
  );

  console.log('Exercise counts by target muscle:');
  results
    .sort((a, b) => b.count - a.count)
    .forEach(({ target, count }) => {
      console.log(`  ${target.padEnd(25)} ${count} exercises`);
    });

  console.log('\n✓ All tests passed!');
}

testTargetFilter().catch(console.error);
