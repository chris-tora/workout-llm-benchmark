import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ivfllbccljoyaayftecd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZmxsYmNjbGpveWFheWZ0ZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjExOTAxNCwiZXhwIjoyMDgxNjk1MDE0fQ.0-GD_WvgZlCOMFThc-4mLMS80GE5wLKFetHe_X_ovUc'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 Testing Filter API Fix\n')
console.log('=' .repeat(60))

// Test 1: Verify RPC functions exist and return data
console.log('\n📊 Test 1: RPC Functions')
console.log('-'.repeat(60))

const { data: equipmentData, error: equipmentError } = await supabase.rpc('get_distinct_equipment')
const { data: bodypartData, error: bodypartError } = await supabase.rpc('get_distinct_bodyparts')

if (equipmentError || bodypartError) {
  console.error('❌ RPC function errors:')
  if (equipmentError) console.error('  Equipment:', equipmentError.message)
  if (bodypartError) console.error('  Bodypart:', bodypartError.message)
  process.exit(1)
}

console.log(`✓ Equipment RPC: ${equipmentData.length} values`)
console.log(`✓ Bodypart RPC: ${bodypartData.length} values`)

// Test 2: Verify expected counts
console.log('\n📈 Test 2: Validate Counts')
console.log('-'.repeat(60))

const expectedEquipment = 27
const expectedBodyparts = 16

if (equipmentData.length === expectedEquipment) {
  console.log(`✓ Equipment count correct: ${expectedEquipment}`)
} else {
  console.log(`❌ Equipment count mismatch: expected ${expectedEquipment}, got ${equipmentData.length}`)
}

if (bodypartData.length === expectedBodyparts) {
  console.log(`✓ Bodypart count correct: ${expectedBodyparts}`)
} else {
  console.log(`❌ Bodypart count mismatch: expected ${expectedBodyparts}, got ${bodypartData.length}`)
}

// Test 3: Verify no invalid values
console.log('\n🔍 Test 3: Data Quality')
console.log('-'.repeat(60))

const equipment = equipmentData.map(row => row.equipment)
const bodyparts = bodypartData.map(row => row.bodypart)

// Check equipment
const invalidEquipment = equipment.filter(e => !e || e.trim() === '' || e === 'Unknown')
if (invalidEquipment.length === 0) {
  console.log('✓ No invalid equipment values')
} else {
  console.log(`❌ Found ${invalidEquipment.length} invalid equipment values:`, invalidEquipment)
}

// Check bodyparts
const invalidBodyparts = bodyparts.filter(b => !b || b.trim() === '' || b === 'unknown' || b === 'weightlifting')
if (invalidBodyparts.length === 0) {
  console.log('✓ No invalid bodypart values')
} else {
  console.log(`❌ Found ${invalidBodyparts.length} invalid bodypart values:`, invalidBodyparts)
}

// Test 4: Verify sorting
console.log('\n📋 Test 4: Alphabetical Sorting')
console.log('-'.repeat(60))

const equipmentSorted = [...equipment].sort()
const bodypartsSorted = [...bodyparts].sort()

const isEquipmentSorted = JSON.stringify(equipment) === JSON.stringify(equipmentSorted)
const isBodypartsSorted = JSON.stringify(bodyparts) === JSON.stringify(bodypartsSorted)

if (isEquipmentSorted) {
  console.log('✓ Equipment values properly sorted')
} else {
  console.log('❌ Equipment values not sorted')
}

if (isBodypartsSorted) {
  console.log('✓ Bodypart values properly sorted')
} else {
  console.log('❌ Bodypart values not sorted')
}

// Test 5: Sample some expected values
console.log('\n✨ Test 5: Expected Values Present')
console.log('-'.repeat(60))

const expectedEquipmentSamples = ['Barbell', 'Dumbbell', 'Body Weight', 'Kettlebell']
const expectedBodypartSamples = ['back', 'chest', 'shoulders', 'waist']

const missingEquipment = expectedEquipmentSamples.filter(e => !equipment.includes(e))
const missingBodyparts = expectedBodypartSamples.filter(b => !bodyparts.includes(b))

if (missingEquipment.length === 0) {
  console.log(`✓ All sample equipment values present: ${expectedEquipmentSamples.join(', ')}`)
} else {
  console.log(`❌ Missing equipment values: ${missingEquipment.join(', ')}`)
}

if (missingBodyparts.length === 0) {
  console.log(`✓ All sample bodypart values present: ${expectedBodypartSamples.join(', ')}`)
} else {
  console.log(`❌ Missing bodypart values: ${missingBodyparts.join(', ')}`)
}

// Final Summary
console.log('\n' + '='.repeat(60))
console.log('📊 SUMMARY')
console.log('='.repeat(60))

const allTestsPassed =
  !equipmentError &&
  !bodypartError &&
  equipmentData.length === expectedEquipment &&
  bodypartData.length === expectedBodyparts &&
  invalidEquipment.length === 0 &&
  invalidBodyparts.length === 0 &&
  isEquipmentSorted &&
  isBodypartsSorted &&
  missingEquipment.length === 0 &&
  missingBodyparts.length === 0

if (allTestsPassed) {
  console.log('\n✅ ALL TESTS PASSED')
  console.log('\nFilter dropdowns are working correctly:')
  console.log(`  • ${equipmentData.length} equipment types available`)
  console.log(`  • ${bodypartData.length} body parts available`)
  console.log('  • All values properly filtered and sorted')
  console.log('  • Ready for production use')
} else {
  console.log('\n❌ SOME TESTS FAILED')
  console.log('\nPlease review the output above for details.')
  process.exit(1)
}

console.log('\n' + '='.repeat(60))
