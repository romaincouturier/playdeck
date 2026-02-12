import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CheckMigrationPage() {
  const supabase = await createClient()

  // Vérifier auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const checks = []

  // Test 1: Table game_master
  try {
    const { error } = await supabase.from('game_master').select('game_id').limit(0)
    if (error) {
      checks.push({ name: 'game_master', status: 'error', message: error.message })
    } else {
      checks.push({ name: 'game_master', status: 'ok', message: 'Table existe' })
    }
  } catch (e: any) {
    checks.push({ name: 'game_master', status: 'error', message: e.message })
  }

  // Test 2: Table turn_state
  try {
    const { error } = await supabase.from('turn_state').select('game_id').limit(0)
    if (error) {
      checks.push({ name: 'turn_state', status: 'error', message: error.message })
    } else {
      checks.push({ name: 'turn_state', status: 'ok', message: 'Table existe' })
    }
  } catch (e: any) {
    checks.push({ name: 'turn_state', status: 'error', message: e.message })
  }

  // Test 3: Colonne game_master_id dans games
  try {
    const { error } = await supabase.from('games').select('game_master_id').limit(0)
    if (error) {
      checks.push({ name: 'games.game_master_id', status: 'error', message: error.message })
    } else {
      checks.push({ name: 'games.game_master_id', status: 'ok', message: 'Colonne existe' })
    }
  } catch (e: any) {
    checks.push({ name: 'games.game_master_id', status: 'error', message: e.message })
  }

  // Test 4: Table zones avec game_id
  try {
    const { error } = await supabase.from('zones').select('game_id').limit(0)
    if (error) {
      checks.push({ name: 'zones.game_id', status: 'error', message: error.message })
    } else {
      checks.push({ name: 'zones.game_id', status: 'ok', message: 'Colonne existe' })
    }
  } catch (e: any) {
    checks.push({ name: 'zones.game_id', status: 'error', message: e.message })
  }

  // Test 5: Colonne zone_id dans game_cards
  try {
    const { error } = await supabase.from('game_cards').select('zone_id').limit(0)
    if (error) {
      checks.push({ name: 'game_cards.zone_id', status: 'error', message: error.message })
    } else {
      checks.push({ name: 'game_cards.zone_id', status: 'ok', message: 'Colonne existe' })
    }
  } catch (e: any) {
    checks.push({ name: 'game_cards.zone_id', status: 'error', message: e.message })
  }

  const allOk = checks.every(c => c.status === 'ok')
  const hasErrors = checks.some(c => c.status === 'error')

  return (
    <div className="min-h-screen bg-st-gray dark:bg-st-anthracite p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-st-anthracite-light rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">
            {allOk ? '✅' : '❌'} État de la migration v2
          </h1>

          {allOk && (
            <div className="bg-green-100 dark:bg-green-900/20 border border-green-500 rounded-lg p-4 mb-6">
              <p className="text-green-800 dark:text-green-200 font-semibold">
                🎉 Migration v2 appliquée avec succès !
              </p>
              <p className="text-green-700 dark:text-green-300 text-sm mt-2">
                Vous pouvez maintenant créer des parties.
              </p>
            </div>
          )}

          {hasErrors && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-800 dark:text-red-200 font-semibold mb-2">
                ⚠️ La migration v2 n'est PAS appliquée !
              </p>
              <p className="text-red-700 dark:text-red-300 text-sm mb-4">
                Pour corriger ce problème :
              </p>
              <ol className="text-red-700 dark:text-red-300 text-sm list-decimal list-inside space-y-2">
                <li>Ouvrez votre Supabase Dashboard</li>
                <li>Allez dans SQL Editor</li>
                <li>Copiez le contenu de <code className="bg-red-200 dark:bg-red-800 px-1 rounded">supabase/migrations/20260211_v2_universal_engine.sql</code></li>
                <li>Collez et exécutez le script</li>
                <li>Rafraîchissez cette page pour vérifier</li>
              </ol>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-xl font-semibold mb-4">Tests effectués :</h2>
            {checks.map((check, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  check.status === 'ok'
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-300'
                    : 'bg-red-50 dark:bg-red-900/10 border-red-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {check.status === 'ok' ? '✅' : '❌'}
                    </span>
                    <div>
                      <p className="font-mono font-semibold">{check.name}</p>
                      <p className={`text-sm ${
                        check.status === 'ok'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {check.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">Fichiers de migration :</h3>
            <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
              <li>📄 <code>supabase/migrations/20260211_v2_universal_engine.sql</code> - Migration principale</li>
              <li>📄 <code>supabase/migrations/check_v2_status.sql</code> - Vérification SQL</li>
              <li>📄 <code>APPLY_MIGRATION_V2.md</code> - Guide complet</li>
            </ul>
          </div>

          <div className="mt-6">
            <a
              href="/decks"
              className="inline-block bg-st-yellow hover:bg-st-yellow/90 text-st-anthracite font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              ← Retour aux decks
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
