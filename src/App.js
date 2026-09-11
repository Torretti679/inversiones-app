import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'
import { GraficoProyeccion } from './Graficos'
import { GraficoHistorico } from './GraficoHistorico'

const formatearNumero = (numero, decimales = 2) => {
  return numero.toLocaleString('es-CL', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  })
}

function App() {
  const [acciones, setAcciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [accionesConCalculos, setAccionesConCalculos] = useState([])

  // Estados para modales
  const [modalEditAccion, setModalEditAccion] = useState(null)
  const [modalEditCompra, setModalEditCompra] = useState(null)
  const [accionesExpandidas, setAccionesExpandidas] = useState({})

  // Estados para formulario de acciones
  const [nombreAccion, setNombreAccion] = useState('')
  const [simboloAccion, setSimboloAccion] = useState('')

  // Estados para formulario de compras
  const [accionIdCompra, setAccionIdCompra] = useState('')
  const [fechaCompra, setFechaCompra] = useState('')
  const [cantidadCompra, setCantidadCompra] = useState('')
  const [precioCompra, setPrecioCompra] = useState('')

  // Estados para formulario de ventas
  const [accionIdVenta, setAccionIdVenta] = useState('')
  const [fechaVenta, setFechaVenta] = useState('')
  const [cantidadVenta, setCantidadVenta] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')

  // Estados para formulario de precios
  const [accionIdPrecio, setAccionIdPrecio] = useState('')
  const [fechaPrecio, setFechaPrecio] = useState('')
  const [horaPrecio, setHoraPrecio] = useState('')
  const [precioPrecio, setPrecioPrecio] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const { data: accionesData, error: errorAcciones } = await supabase
        .from('acciones')
        .select('*')

      if (errorAcciones) throw errorAcciones

      const accionesConDatos = await Promise.all(
        accionesData.map(async (accion) => {
          const { data: comprasData } = await supabase
            .from('compras')
            .select('*')
            .eq('accion_id', accion.id)
            .order('fecha', { ascending: false })

          const { data: preciosData } = await supabase
            .from('precios_historicos')
            .select('*')
            .eq('accion_id', accion.id)
            .order('fecha', { ascending: false })
            .order('hora', { ascending: false })
            .limit(1)

          // CÁLCULOS CORREGIDOS
          
          // 1. Calcular cantidad actual (suma de todas las transacciones)
          const cantidadTotal = comprasData.reduce((sum, compra) => sum + compra.cantidad, 0)

          // 2. Calcular precio promedio ponderado SOLO de compras (cantidad positiva)
          const compras = comprasData.filter(c => c.cantidad > 0)
          const totalCantidadComprada = compras.reduce((sum, c) => sum + c.cantidad, 0)
          const totalInvertido = compras.reduce((sum, c) => sum + (c.cantidad * c.precio_unitario), 0)
          const preciopromedioCompra = totalCantidadComprada > 0 ? totalInvertido / totalCantidadComprada : 0

          // 3. Costo base = cantidad actual × precio promedio de compra
          // (Solo si tienes acciones positivas)
          const costoBase = cantidadTotal > 0 ? cantidadTotal * preciopromedioCompra : 0

          // 4. Precio actual (último precio registrado)
          const precioActual = preciosData && preciosData.length > 0 ? preciosData[0].precio : 0

          // 5. Valor actual = cantidad actual × precio actual
          const valorActual = cantidadTotal * precioActual

          // 6. Ganancia no realizada = valor actual - costo base
          const gananciaNR = valorActual - costoBase

          // 7. Porcentaje de retorno
          const porcentajeGanancia = costoBase > 0 ? ((gananciaNR / costoBase) * 100).toFixed(2) : 0

          // 8. Ganancias realizadas (ventas)
          const ventas = comprasData.filter(c => c.cantidad < 0)
          const gananciaRealizada = ventas.reduce((sum, v) => {
            const cantidadVendida = Math.abs(v.cantidad)
            const precioVenta = v.precio_unitario
            const costoVenta = cantidadVendida * preciopromedioCompra
            return sum + ((precioVenta - preciopromedioCompra) * cantidadVendida)
          }, 0)

          return {
            ...accion,
            cantidadTotal,
            precioActual,
            preciopromedioCompra,
            costoBase,
            valorActual,
            gananciaNR,
            gananciaRealizada,
            gananciaTotal: gananciaNR + gananciaRealizada,
            porcentajeGanancia,
            compras: comprasData,
            ultimoPrecio: preciosData && preciosData.length > 0 ? preciosData[0] : null
          }
        })
      )

      setAcciones(accionesData)
      setAccionesConCalculos(accionesConDatos)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular totales del portafolio
  const totales = accionesConCalculos.reduce(
    (acc, accion) => ({
      valorTotal: acc.valorTotal + accion.valorActual,
      costoTotal: acc.costoTotal + accion.costoBase,
      gananciaTotal: acc.gananciaTotal + accion.gananciaTotal
    }),
    { valorTotal: 0, costoTotal: 0, gananciaTotal: 0 }
  )

  const porcentajeTotalGanancia = totales.costoTotal > 0 ? ((totales.gananciaTotal / totales.costoTotal) * 100).toFixed(2) : 0

  // Calcular ahorro mensual necesario para retiro
  const edadActual = 55
  const edadRetiro = 64
  const edadMuerte = 85
  const rentabilidad = 0.12
  const inflacion = 0.05
  const retiroMensual = 2000000

  const aniosHastaRetiro = edadRetiro - edadActual
  const retiroAnual = retiroMensual * 12
  const r = rentabilidad
  const g = inflacion
  const n = edadMuerte - edadRetiro
  
  let capitalNecesario
  if (r !== g) {
    capitalNecesario = (retiroAnual * (1 - Math.pow((1 + g) / (1 + r), n))) / (r - g)
  } else {
    capitalNecesario = retiroAnual * n
  }
  
  const capitalProyectado = totales.valorTotal * Math.pow(1 + rentabilidad, aniosHastaRetiro)
  const diferencia = capitalNecesario - capitalProyectado
  const ahorroMensualNecesario = diferencia > 0 ? (diferencia / (aniosHastaRetiro * 12)) : 0

  // FUNCIONES DE ACCIONES
  const agregarAccion = async (e) => {
    e.preventDefault()
    if (!nombreAccion || !simboloAccion) {
      alert('Completa todos los campos')
      return
    }

    try {
      const { error } = await supabase
        .from('acciones')
        .insert([{ nombre: nombreAccion, simbolo: simboloAccion.toUpperCase() }])

      if (error) throw error
      setNombreAccion('')
      setSimboloAccion('')
      alert('✅ Acción agregada')
      cargarDatos()
    } catch (error) {
      alert('❌ Error: ' + error.message)
    }
  }

  const editarAccion = async (e) => {
    e.preventDefault()
    if (!modalEditAccion.nombre || !modalEditAccion.simbolo) {
      alert('Completa todos los campos')
      return
    }

    try {
      const { error } = await supabase
        .from('acciones')
        .update({ nombre: modalEditAccion.nombre, simbolo: modalEditAccion.simbolo.toUpperCase() })
        .eq('id', modalEditAccion.id)

      if (error) throw error
      alert('✅ Acción editada')
      setModalEditAccion(null)
      cargarDatos()
    } catch (error) {
      alert('❌ Error: ' + error.message)
    }
  }

  const eliminarAccion = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta acción y todas sus compras/precios?')) {
      try {
        await supabase.from('precios_historicos').delete().eq('accion_id', id)
        await supabase.from('compras').delete().eq('accion_id', id)
        await supabase.from('acciones').delete().eq('id', id)

        alert('✅ Acción eliminada')
        cargarDatos()
      } catch (error) {
        alert('❌ Error: ' + error.message)
      }
    }
  }

  // FUNCIONES DE COMPRAS
  const agregarCompra = async (e) => {
    e.preventDefault()
    if (!accionIdCompra || !fechaCompra || !cantidadCompra || !precioCompra) {
      alert('Completa todos los campos')
      return
    }

    try {
      const { error } = await supabase
        .from('compras')
        .insert([{
          accion_id: parseInt(accionIdCompra),
          fecha: fechaCompra,
          cantidad: parseFloat(cantidadCompra),
          precio_unitario: parseFloat(precioCompra)
        }])

      if (error) throw error
      setAccionIdCompra('')
      setFechaCompra('')
      setCantidadCompra('')
      setPrecioCompra('')
      alert('✅ Compra agregada')
      cargarDatos()
    } catch (error) {
      alert('❌ Error: ' + error.message)
    }
  }

  const editarCompra = async (e) => {
    e.preventDefault()
    if (!modalEditCompra.fecha || !modalEditCompra.cantidad || !modalEditCompra.precio_unitario) {
      alert('Completa todos los campos')
      return
    }

    try {
      const { error } = await supabase
        .from('compras')
        .update({
          fecha: modalEditCompra.fecha,
          cantidad: parseFloat(modalEditCompra.cantidad),
          precio_unitario: parseFloat(modalEditCompra.precio_unitario)
        })
        .eq('id', modalEditCompra.id)

      if (error) throw error
      alert('✅ Compra editada')
      setModalEditCompra(null)
      cargarDatos()
    } catch (error) {
      alert('❌ Error: ' + error.message)
    }
  }

  const eliminarCompra = async (id) => {
    if (window.confirm('¿Eliminar esta compra?')) {
      try {
        const { error } = await supabase.from('compras').delete().eq('id', id)
        if (error) throw error
        alert('✅ Compra eliminada')
        cargarDatos()
      } catch (error) {
        alert('❌ Error: ' + error.message)
      }
    }
  }

  // FUNCIONES DE VENTAS
  const agregarVenta = async (e) => {
    e.preventDefault()
    if (!accionIdVenta || !fechaVenta || !cantidadVenta || !precioVenta) {
      alert('Completa todos los campos')
      return
    }

    try {
      const { error } = await supabase
        .from('compras')
        .insert([{
          accion_id: parseInt(accionIdVenta),
          fecha: fechaVenta,
          cantidad: -parseFloat(cantidadVenta),
          precio_unitario: parseFloat(precioVenta),
          comentario: 'Venta'
        }])

      if (error) throw error
      setAccionIdVenta('')
      setFechaVenta('')
      setCantidadVenta('')
      setPrecioVenta('')
      alert('✅ Venta registrada')
      cargarDatos()
    } catch (error) {
      alert('❌ Error: ' + error.message)
    }
  }

  // FUNCIONES DE PRECIOS
  const agregarPrecio = async (e) => {
    e.preventDefault()
    if (!accionIdPrecio || !fechaPrecio || !horaPrecio || !precioPrecio) {
      alert('Completa todos los campos')
      return
    }

    try {
      const { error } = await supabase
        .from('precios_historicos')
        .insert([{
          accion_id: parseInt(accionIdPrecio),
          fecha: fechaPrecio,
          hora: horaPrecio,
          precio: parseFloat(precioPrecio)
        }])

      if (error) throw error
      setAccionIdPrecio('')
      setFechaPrecio('')
      setHoraPrecio('')
      setPrecioPrecio('')
      alert('✅ Precio agregado')
      cargarDatos()
    } catch (error) {
      alert('❌ Error: ' + error.message)
    }
  }

  const toggleExpandir = (id) => {
    setAccionesExpandidas(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  return (
    <div className="App">
      <header className="header">
        <h1>📈 Mi Portafolio de Acciones</h1>
      </header>

      <main className="container">
        <section className="resumen">
          <h2>📊 Resumen del Portafolio</h2>
          <div className="resumen-grid">
            <div className="resumen-card">
              <p className="label">Valor Total</p>
              <p className="valor">${formatearNumero(totales.valorTotal)}</p>
            </div>
            <div className="resumen-card">
              <p className="label">Costo Total Invertido</p>
              <p className="valor">${formatearNumero(totales.costoTotal)}</p>
            </div>
            <div className="resumen-card">
              <p className="label">Ganancia Total</p>
              <p className={`valor ${totales.gananciaTotal >= 0 ? 'positivo' : 'negativo'}`}>
                ${formatearNumero(totales.gananciaTotal)} ({porcentajeTotalGanancia}%)
              </p>
            </div>
            <div className="resumen-card">
              <p className="label">Ahorro Mensual Necesario</p>
              <p className="valor">${formatearNumero(ahorroMensualNecesario)}</p>
              <p className="label-pequeño">Para alcanzar meta a los 64 años</p>
            </div>
          </div>
        </section>

        <section className="cartera">
          <h2>Mis Acciones</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : accionesConCalculos.length === 0 ? (
            <p>No tienes acciones aún. ¡Agrega una!</p>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th></th>
                  <th>Símbolo</th>
                  <th>Cantidad</th>
                  <th>Precio Actual</th>
                  <th>Precio Promedio</th>
                  <th>Costo Base</th>
                  <th>Valor Actual</th>
                  <th>Ganancia</th>
                  <th>% Retorno</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {accionesConCalculos.map((accion) => (
                  <React.Fragment key={accion.id}>
                    <tr>
                      <td onClick={() => toggleExpandir(accion.id)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                        {accionesExpandidas[accion.id] ? '▼' : '▶'}
                      </td>
                      <td className="simbolo">{accion.simbolo}</td>
                      <td>{accion.cantidadTotal}</td>
                      <td>${formatearNumero(accion.precioActual)}</td>
                      <td>${formatearNumero(accion.preciopromedioCompra)}</td>
                      <td>${formatearNumero(accion.costoBase)}</td>
                      <td>${formatearNumero(accion.valorActual)}</td>
                      <td className={accion.gananciaTotal >= 0 ? 'positivo' : 'negativo'}>
                        ${formatearNumero(accion.gananciaTotal)}
                      </td>
                      <td className={accion.gananciaTotal >= 0 ? 'positivo' : 'negativo'}>
                        {accion.porcentajeGanancia}%
                      </td>
                      <td>
                        <button className="btn-pequeño btn-editar" onClick={() => setModalEditAccion(accion)}>✏️</button>
                        <button className="btn-pequeño btn-eliminar" onClick={() => eliminarAccion(accion.id)}>🗑️</button>
                      </td>
                    </tr>
                    {accionesExpandidas[accion.id] && (
                      <tr className="fila-expandida">
                        <td colSpan="10">
                          <div className="compras-detalle">
                            <h4>Compras/Ventas de {accion.simbolo}</h4>
                            {accion.compras.length === 0 ? (
                              <p>No hay transacciones registradas</p>
                            ) : (
                              <table className="tabla-compras">
                                <thead>
                                  <tr>
                                    <th>Fecha</th>
                                    <th>Cantidad</th>
                                    <th>Precio Unitario</th>
                                    <th>Total</th>
                                    <th>Tipo</th>
                                    <th>Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {accion.compras.map(compra => (
                                    <tr key={compra.id}>
                                      <td>{compra.fecha}</td>
                                      <td className={compra.cantidad > 0 ? 'positivo' : 'negativo'}>
                                        {compra.cantidad}
                                      </td>
                                      <td>${formatearNumero(compra.precio_unitario)}</td>
                                      <td>${formatearNumero(compra.cantidad * compra.precio_unitario)}</td>
                                      <td>{compra.cantidad > 0 ? '🟢 Compra' : '🔴 Venta'}</td>
                                      <td>
                                        <button className="btn-pequeño btn-editar" onClick={() => setModalEditCompra(compra)}>✏️</button>
                                        <button className="btn-pequeño btn-eliminar" onClick={() => eliminarCompra(compra.id)}>🗑️</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="graficos">
          <h2>📈 Proyección de Retiro</h2>
          <GraficoProyeccion 
            edadActual={edadActual}
            edadRetiro={edadRetiro}
            edadMuerte={edadMuerte}
            rentabilidad={rentabilidad}
            inflacion={inflacion}
            capitalActual={totales.valorTotal}
          />
        </section>

        <section className="graficos">
          <h2>📊 Histórico del Portafolio</h2>
          <GraficoHistorico accionesConCalculos={accionesConCalculos} />
        </section>

        <section className="formularios">
          <h2>➕ Agregar Nueva Acción</h2>
          <form onSubmit={agregarAccion} className="form">
            <input type="text" placeholder="Nombre (ej: Apple)" value={nombreAccion} onChange={(e) => setNombreAccion(e.target.value)} />
            <input type="text" placeholder="Símbolo (ej: AAPL)" value={simboloAccion} onChange={(e) => setSimboloAccion(e.target.value)} />
            <button type="submit">Agregar Acción</button>
          </form>

          <h2>💰 Agregar Compra</h2>
          <form onSubmit={agregarCompra} className="form">
            <select value={accionIdCompra} onChange={(e) => setAccionIdCompra(e.target.value)}>
              <option value="">Selecciona una acción</option>
              {acciones.map((accion) => (
                <option key={accion.id} value={accion.id}>
                  {accion.simbolo}
                </option>
              ))}
            </select>
            <input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} />
            <input type="number" placeholder="Cantidad" value={cantidadCompra} onChange={(e) => setCantidadCompra(e.target.value)} />
            <input type="number" placeholder="Precio unitario" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} />
            <button type="submit">Agregar Compra</button>
          </form>

          <h2>📉 Registrar Venta</h2>
          <form onSubmit={agregarVenta} className="form">
            <select value={accionIdVenta} onChange={(e) => setAccionIdVenta(e.target.value)}>
              <option value="">Selecciona una acción</option>
              {acciones.map((accion) => (
                <option key={accion.id} value={accion.id}>
                  {accion.simbolo}
                </option>
              ))}
            </select>
            <input type="date" value={fechaVenta} onChange={(e) => setFechaVenta(e.target.value)} />
            <input type="number" placeholder="Cantidad a vender" value={cantidadVenta} onChange={(e) => setCantidadVenta(e.target.value)} />
            <input type="number" placeholder="Precio de venta" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} />
            <button type="submit">Registrar Venta</button>
          </form>

          <h2>📈 Agregar Precio Actual</h2>
          <form onSubmit={agregarPrecio} className="form">
            <select value={accionIdPrecio} onChange={(e) => setAccionIdPrecio(e.target.value)}>
              <option value="">Selecciona una acción</option>
              {acciones.map((accion) => (
                <option key={accion.id} value={accion.id}>
                  {accion.simbolo}
                </option>
              ))}
            </select>
            <input type="date" value={fechaPrecio} onChange={(e) => setFechaPrecio(e.target.value)} />
            <input type="time" value={horaPrecio} onChange={(e) => setHoraPrecio(e.target.value)} />
            <input type="number" placeholder="Precio" value={precioPrecio} onChange={(e) => setPrecioPrecio(e.target.value)} />
            <button type="submit">Agregar Precio</button>
          </form>
        </section>
      </main>

      {/* MODAL EDITAR ACCIÓN */}
      {modalEditAccion && (
        <div className="modal-overlay" onClick={() => setModalEditAccion(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ Editar Acción</h2>
            <form onSubmit={editarAccion}>
              <input
                type="text"
                placeholder="Nombre"
                value={modalEditAccion.nombre}
                onChange={(e) => setModalEditAccion({ ...modalEditAccion, nombre: e.target.value })}
              />
              <input
                type="text"
                placeholder="Símbolo"
                value={modalEditAccion.simbolo}
                onChange={(e) => setModalEditAccion({ ...modalEditAccion, simbolo: e.target.value })}
              />
              <div className="modal-botones">
                <button type="submit" className="btn-confirmar">Guardar</button>
                <button type="button" className="btn-cancelar" onClick={() => setModalEditAccion(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR COMPRA */}
      {modalEditCompra && (
        <div className="modal-overlay" onClick={() => setModalEditCompra(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ Editar Transacción</h2>
            <form onSubmit={editarCompra}>
              <input
                type="date"
                value={modalEditCompra.fecha}
                onChange={(e) => setModalEditCompra({ ...modalEditCompra, fecha: e.target.value })}
              />
              <input
                type="number"
                placeholder="Cantidad"
                value={modalEditCompra.cantidad}
                onChange={(e) => setModalEditCompra({ ...modalEditCompra, cantidad: e.target.value })}
              />
              <input
                type="number"
                placeholder="Precio unitario"
                value={modalEditCompra.precio_unitario}
                onChange={(e) => setModalEditCompra({ ...modalEditCompra, precio_unitario: e.target.value })}
              />
              <div className="modal-botones">
                <button type="submit" className="btn-confirmar">Guardar</button>
                <button type="button" className="btn-cancelar" onClick={() => setModalEditCompra(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App