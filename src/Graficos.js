import React from 'react'
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

export const GraficoProyeccion = ({ edadActual = 55, edadRetiro = 64, edadMuerte = 85, rentabilidad = 0.12, inflacion = 0.05, capitalActual = 0 }) => {
  // Calcular años
  const aniosRetiro = edadMuerte - edadRetiro
  const aniosHastaRetiro = edadRetiro - edadActual
  
  // Capital necesario para retiro
  const retiroMensual = 2000000
  const retiroAnual = retiroMensual * 12
  
  // Cálculo del valor presente de anualidad creciente
  const r = rentabilidad
  const g = inflacion
  const n = aniosRetiro
  
  let capitalNecesario
  if (r !== g) {
    capitalNecesario = (retiroAnual * (1 - Math.pow((1 + g) / (1 + r), n))) / (r - g)
  } else {
    capitalNecesario = retiroAnual * n
  }
  
  // Generar datos de proyección (9 años hasta retiro)
  const edades = []
  const proyeccionIdeal = []
  const proyeccionReal = []
  
  for (let i = 0; i <= aniosHastaRetiro; i++) {
    const edad = edadActual + i
    edades.push(edad.toString())
    
    // Proyección ideal: lo que deberías tener acumulado
    const fraccion = i / aniosHastaRetiro
    const ideal = capitalNecesario * (1 - Math.pow(1 - fraccion, 2))
    proyeccionIdeal.push(ideal)
    
    // Proyección real: tu capital creciendo al 12%
    const real = capitalActual * Math.pow(1 + rentabilidad, i)
    proyeccionReal.push(real)
  }
  
  const data = {
    labels: edades,
    datasets: [
      {
        label: 'Proyección Ideal (Meta)',
        data: proyeccionIdeal,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4
      },
      {
        label: 'Tu Trayectoria (12% anual)',
        data: proyeccionReal,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#10b981',
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
          padding: 15,
          usePointStyle: true
        }
      },
      title: {
        display: true,
        text: 'Proyección de Portafolio hasta Retiro (64 años)',
        font: { size: 16, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': $' + formatearNumero(context.parsed.y)
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + (value / 1000000).toFixed(0) + 'M'
          },
          font: { size: 11 }
        }
      },
      x: {
        ticks: {
          font: { size: 11 }
        }
      }
    }
  }

  // Calcular diferencia
  const capitalProyectado = capitalActual * Math.pow(1 + rentabilidad, aniosHastaRetiro)
  const diferencia = capitalNecesario - capitalProyectado
  const porcentajeAlcance = ((capitalProyectado / capitalNecesario) * 100).toFixed(1)
  
  // Calcular ahorro mensual necesario
  const ahorroMensualNecesario = (diferencia / (aniosHastaRetiro * 12)) > 0 ? diferencia / (aniosHastaRetiro * 12) : 0

  return (
    <div className="grafico-container">
      <div className="grafico-wrapper">
        <Line data={data} options={options} />
      </div>
      
      <div className="analisis-proyeccion">
        <h3>📊 Análisis de tu Plan de Retiro</h3>
        <div className="analisis-grid">
          <div className="analisis-card">
            <p className="analisis-label">Capital Necesario a los {edadRetiro} años</p>
            <p className="analisis-valor">${formatearNumero(capitalNecesario / 1000000, 0)}M</p>
          </div>
          <div className="analisis-card">
            <p className="analisis-label">Capital Proyectado a los {edadRetiro} años</p>
            <p className="analisis-valor">${formatearNumero(capitalProyectado / 1000000, 0)}M</p>
          </div>
          <div className={`analisis-card ${diferencia > 0 ? 'alerta' : 'exito'}`}>
            <p className="analisis-label">{diferencia > 0 ? 'Falta' : 'Supera'}</p>
            <p className="analisis-valor">${formatearNumero(Math.abs(diferencia) / 1000000, 0)}M</p>
          </div>
          <div className="analisis-card">
            <p className="analisis-label">% de Meta Alcanzado</p>
            <p className="analisis-valor">{porcentajeAlcance}%</p>
          </div>
        </div>
        
        {diferencia > 0 && (
          <div className="advertencia">
            <strong>⚠️ Alerta:</strong> A este ritmo, te faltarán ${formatearNumero(diferencia / 1000000, 0)}M para alcanzar tu meta de ${formatearNumero(capitalNecesario / 1000000, 0)}M a los {edadRetiro} años.
            <br />
            <strong>Necesitas ahorrar aproximadamente ${formatearNumero(ahorroMensualNecesario)} mensuales adicionales</strong> (además de tu rentabilidad del 12%) para alcanzar la meta.
          </div>
        )}
        
        {diferencia <= 0 && (
          <div className="exito-msg">
            <strong>✅ ¡Excelente noticia!</strong> A este ritmo de rentabilidad (12% anual), superarás tu meta de retiro. 
            Podrás vivir confortablemente con ${formatearNumero(retiroMensual)} mensuales desde los {edadRetiro} hasta los {edadMuerte} años.
          </div>
        )}
      </div>
    </div>
  )
}