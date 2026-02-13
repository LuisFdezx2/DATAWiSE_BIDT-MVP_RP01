/**
 * Job Programado: Auto-recuperación de Sensores
 * 
 * Se ejecuta cada 15 minutos para detectar sensores en fallback
 * prolongado e intentar reconectarlos automáticamente.
 * 
 * Configuración del cron:
 * - Expresión: 0 asterisk-slash-15 asterisk asterisk asterisk asterisk (cada 15 minutos)
 * - Timezone: UTC
 */

import { runAutoRecovery } from '../auto-recovery-service';

export async function sensorAutoRecoveryJob() {
  console.log('[Auto-Recovery] Starting sensor auto-recovery job...');
  
  try {
    const result = await runAutoRecovery();
    
    console.log('[Auto-Recovery] Job completed:', {
      sensorsChecked: result.sensorsChecked,
      recoveryAttempts: result.recoveryAttempts,
      successfulRecoveries: result.successfulRecoveries,
      failedRecoveries: result.failedRecoveries,
    });

    // Si hubo recuperaciones exitosas, registrar en log
    if (result.successfulRecoveries > 0) {
      console.log(`[Auto-Recovery] ✅ Successfully recovered ${result.successfulRecoveries} sensor(s)`);
    }

    // Si hubo fallos, registrar warning
    if (result.failedRecoveries > 0) {
      console.warn(`[Auto-Recovery] ⚠️  Failed to recover ${result.failedRecoveries} sensor(s)`);
    }

    return result;
  } catch (error) {
    console.error('[Auto-Recovery] Job failed:', error);
    throw error;
  }
}

// Permitir ejecución manual para pruebas
if (require.main === module) {
  sensorAutoRecoveryJob()
    .then(result => {
      console.log('Manual execution completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Manual execution failed:', error);
      process.exit(1);
    });
}
