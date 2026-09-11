import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const formatearNumero = (numero, decimales = 2) => {
  return numero.toLocaleString('es-CL', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  })
}

export const GraficoHistorico = ({ accionesConCalculos }) => {
  const [periodo, setPeriodo] = useState(12) // 12, 6, 3, 1 meses
  const [datos, setDatos] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    calcularHistorico()
  }, [periodo, accionesConCalculos])

  const calcularHistorico = async () => {
    setLoading(true)
    try {
      // Obtener todas las fechas de precios en el período
      const fechaLimite = new Date()
      fechaLimite.setMonth(fechaLimite.getMonth() - periodo)
      
      const { data: preciosData } = await supabase
        .from('precios_historicos')
        .select('fecha, accion_id, precio')
        .gte('fecha', fechaLimite.toISOString().split('T')[0])
        .order('fecha', { ascending: true })

      if (!preciosData || preciosData.length === 0) {
        setDatos([])
        setLoading(false)
        return
      }

      // Agrupar por fecha
      const fechas = [...new Set(preciosData.map(p => p.fecha))].sort()
      
      // Para cada fecha, calcular valor total del portafolio
      const historico = await Promise.all(
        fechas.map(async (fecha) => {
          let valorTotal = 0

          // Para cada acción
          for (const accion of accionesConCalculos) {
            // Obtener precio en esa fecha (más reciente antes de esa fecha)
            const { data: precioEnFecha } = await supabase
              .from('precios_historicos')
              .select('precio')
              .eq('accion_id', accion.id)
              .lte('fecha', fecha)
              .order('fecha', { ascending: false })
              .limit(1)

            // Obtener cantidad en esa fecha (suma de compras hasta esa fecha)
            const { data: comprasEnFecha } = await supabase
              .from('compras')
              .select('cantidad')
              .eq('accion_id', accion.id)
              .lte('fecha', fecha)

            const precio = precioEnFecha && precioEnFecha.length > 0 ? precioEnFecha[0].precio : 0
            const cantidad = comprasEnFecha ? comprasEnFecha.reduce((sum, c) => sum + c.cantidad, 0) : 0
            
            valorTotal += cantidad * precio
          }

          return {
            fecha,
            valor: valorTotal
          }
        })
      )

      setDatos(historico)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Preparar datos para gráfico
  const labels = datos.map(d => d.fecha)
  const valores = datos.map(d => d.valor)
  
  // Calcular valor inicial y final
  const valorInicial = valores.length > 0 ? valores[0] : 0
  const valorFinal = valores.length > 0 ? valores[valores.length - 1] : 0
  const cambio = valorFinal - valorInicial
  const porcentajeCambio = valorInicial > 0 ? ((cambio / valorInicial) * 100).toFixed(2) : 0

  const data = {
    labels,
    datasets: [
      {
        label: 'Valor del Portafolio',
        data: valores,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 3,
        pointRadius: 3,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 12, weight: 'bold' },
          padding: 15
        }
      },
      title: {
        display: true,
        text: `Evolución del Portafolio - Últimos ${periodo} meses`,
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return 'Valor: $' + formatearNumero(context.parsed.y)
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + (value / 1000000).toFixed(1) + 'M'
          }
        }
      }
    }
  }

  return (
    <div className="grafico-historico-container">
      <div className="filtros-periodo">
        <button 
          className={`btn-filtro ${periodo === 1 ? 'activo' : ''}`}
          onClick={() => setPeriodo(1)}
        >
          1 mes
        </button>
        <button 
          className={`btn-filtro ${periodo === 3 ? 'activo' : ''}`}
          onClick={() => setPeriodo(3)}
        >
          3 meses
        </button>
        <button 
          className={`btn-filtro ${periodo === 6 ? 'activo' : ''}`}
          onClick={() => setPeriodo(6)}
        >
          6 meses
        </button>
        <button 
          className={`btn-filtro ${periodo === 12 ? 'activo' : ''}`}
          onClick={() => setPeriodo(12)}
        >
          12 meses
        </button>
      </div>

      {loading ? (
        <p>Cargando histórico...</p>
      ) : datos.length === 0 ? (
        <p>No hay datos históricos disponibles. Agrega precios en diferentes fechas para ver la evolución.</p>
      ) : (
        <>
          <div className="grafico-wrapper">
            <Line data={data} options={options} />
          </div>

          <div className="estadisticas-historico">
            <div className="stat-card">
              <p className="stat-label">Valor Inicial</p>
              <p className="stat-valor">${formatearNumero(valorInicial)}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Valor Actual</p>
              <p className="stat-valor">${formatearNumero(valorFinal)}</p>
            </div>
            <div className={`stat-card ${cambio >= 0 ? 'positivo' : 'negativo'}`}>
              <p className="stat-label">Cambio</p>
              <p className="stat-valor">${formatearNumero(cambio)} ({porcentajeCambio}%)</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}