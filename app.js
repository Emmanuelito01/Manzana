const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const app = express();
const sesision = require('express-session');
const path=require('path');
const { Console } = require('console');
//descargar paquete npm i -g --save express-session

// Configurar middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

// NO OLVIDAR DESCOMENTAR LAS COSAS

app.use(sesision({
 secret:'Hola',  //CADENA SECRETA , PARA FIRMAR GUARDAR EL ID DE LAS COOKIES DE LA SESION; UNICA
resave: false, //VOLVER A GUARDAR O PEDIR LAS COOKIES
saveUninitialized:false  //SABER UNA SESION VACIA 
}))
app.use(express.static(path.join(__dirname))) // servir los documentos desde un directorio ------ carpeta donde esta creada los archivos


//Creacion de la coneccion
const db =({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'unman',
    timezone: '-05:00:00'
  });
//Crear usuarios
app.post('/crear', async (req,res)=>{
    const { Nombre, Tipo, Documento, id_manzanas} = req.body; 
    try{
    //Verificador de usuario
    const conect=await mysql.createConnection(db)
    const [indicador]=await conect.execute('SELECT * FROM usuario WHERE Documento=? AND Tipo=?',[Documento,Tipo]);
    if(indicador.length>0){
      res.status(409).send(`
      <script>
      window.onload = function(){
        alert("Este Usuario Ya Existe");
        window.location.href = '/Ingreso.html';
      }
    </script>
      `)
    }
    else{
    await conect.execute('INSERT INTO usuario (Nombre, Tipo,Documento, id_manzanas) VALUES (?, ?,?,?)',
    [Nombre, Tipo,Documento, id_manzanas])
    res.status(201).send(`
    <script>
      window.onload = function(){
        alert("Datos Guardados :3");
        window.location.href = '/inicio.html'; 
      }
    </script>
    `)}
    await conect.end()
    }
    catch(error){
        console.error('Error en el servidor:', error);
        res.status(500).send(`
        <script>
          window.onload = function(){
            alert("Error En El Envío... :c");
            window.location.href = '/Ingreso.html';
          }
        </script>
        `)
        
    }
})

// app.post('/manzanas-usuario',async(req,res)=>{
//   const {manzana}=req.body
//   try {
//     const conect=await mysql.createConnection(db) 
//     const [obtenerManzana] = await conect.execute('SELECT manzanas.`Nombre` FROM manzanas',[manzana]);
//     console.log("manzanass",obtenerManzana)
//     res.json({manzanas: obtenerManzana.map(row=>row.Nombre)})
//     await conect.end()
//   } 
//   catch(error){
//     console.error('Error En El Servidor:',error);
//    res.status(500).send('Error En El Servidor.. :c');
// }
// })


//Ruta para manejar Login
app.post('/inicia', async(req,res)=>{
  const {Tipo,Documento}= req.body
  try{
    //Verifique las credenciales
    const conect=await mysql.createConnection(db) //reemplazar el db.query por conect.execute
    const [indicador]=await conect.execute('SELECT * FROM usuario WHERE Documento=? AND Tipo=?',[Documento,Tipo]);
    console.log(indicador);
    if(indicador.length>0){
      req.session.usuario=indicador[0].Nombre;
      req.session.Documento=Documento;
      if(indicador[0].rol=="administrador"){
      res.sendFile(path.join(__dirname,'admin.html'));
      }
      else{
        const usuario={nombre:indicador[0].Nombre}
        console.log(usuario)
        res.locals.usuario=usuario;
      res.sendFile(path.join(__dirname,'usuario.html'));
    }
    }
    else{
      res.status(401).send(`
      <script>
      window.onload = function(){
        alert("Usuario no registrado");
        window.location.href = '/Ingreso.html';
      }
    </script>
      `)
    }
    await conect.end()
  }
  
  catch(error){
    console.error("Error En El Servidor",error);
    res.status(500).send(`

    <script>
      window.onload = function(){
        alert("Error En El Servidor :c");
        window.location.href = '/inicio.html';
      }
    </script>
    `)
  }
  
})

app.post('/obtener-usuario',(req,res)=>{
  const usuario =req.session.usuario;
  if(usuario){
    res.json({nombre: usuario})
  }
  else{
    console.error('error al obtener el usuario')
  }
})

//muestra los servicios que el usuario posee por la manzana
app.post('/obtener-servicios-usuario',async(req,res)=>{
  const usuario=req.session.usuario;
  const Documento=req.session.Documento;
  console.log(usuario,Documento)
  try{
  const conect= await mysql.createConnection(db)
  const [serviciosData]= await conect.execute('SELECT servicios.Nombre FROM usuario INNER JOIN manzanas ON usuario.id_manzanas= manzanas.id_manzanas INNER JOIN manzana_servicios ON manzanas.id_manzanas= manzana_servicios.id_m INNER JOIN servicios ON manzana_servicios.id_s=servicios.id_servicios WHERE servicios.id_servicios=id_servicios AND usuario.`Nombre`=?',[usuario]);
  console.log("servicioosss",serviciosData);
  res.json({servicios: serviciosData.map(row=>row.Nombre)})
  await conect.end()
  }
  catch(error){
         console.error('Error En El Servidor:',error);
        res.status(500).send('Error En El Servidor.. :c');
  }
})

//agrega los servicios
app.post('/guardar-servicios-usuario',async(req,res)=>{
  const usuario=req.session.usuario;
  const Documento=req.session.Documento;
  const {servicios,fechaHora}=req.body;
  try{
    const conect= await mysql.createConnection(db)
    const [IDS] = await conect.query('SELECT servicios.id_servicios from servicios where servicios.`Nombre`=?',[servicios]);
    const [IDU] =await conect.execute('SELECT usuario.id_user FROM usuario WHERE usuario.`Documento`=?',[Documento]);
    console.log(IDU[0].id_user, IDU)
    await conect.query(' INSERT INTO solicitudes (fecha, id1, codigoS) VALUES (?,?,?)', [fechaHora, IDU[0].id_user,IDS[0].id_servicios]);
    res.status(200).send('servicios guardados super deluxe')
    await conect.end()
  }
  catch(error){
    console.error('Error En El Servidor:',error);
   res.status(500).send('Error En El Servidor.. :c');
}
})

//mostrar los servicios que tiene el usuario
app.post('/obtener-servicios-guardados',async(req,res)=>{
  const Documento=req.session.Documento;
  try{
    const conect= await mysql.createConnection(db)
    const [IDU] =await conect.execute('SELECT usuario.id_user FROM usuario WHERE usuario.`Documento`=?',[Documento]);
    console.log("este es el documento",IDU)
    const [serviciosGuardadosData] =await conect.query('SELECT solicitudes.fecha, solicitudes.id_solicitudes, servicios.`Nombre` , usuario.`Documento` FROM solicitudes INNER JOIN usuario ON usuario.id_user = solicitudes.id1 INNER JOIN manzanas on manzanas.id_manzanas = usuario.id_manzanas INNER JOIN manzana_servicios on manzana_servicios.id_m = manzanas.id_manzanas INNER JOIN servicios ON servicios.id_servicios = manzana_servicios.id_s WHERE usuario.`Documento`=? AND servicios.id_servicios=solicitudes.`codigoS` ',[Documento])// verificar consulta pq no da
    const serviciosGuardadosFiltrados=serviciosGuardadosData.map(servicio=>({
      id: servicio.id_solicitudes,
      Nombre: servicio.Nombre,
      fecha: servicio.fecha
    }))
    res.json({serviciosGuardados: serviciosGuardadosFiltrados})
    console.log("estos son los servicios guardados",serviciosGuardadosData);
    console.log(serviciosGuardadosFiltrados)
    await conect.end()
  }
  catch(error){
    console.error('Error En El Servidor:',error);
   res.status(500).send('Error En El Servidor.. :c');
}
})

//eliminar los servicios
app.delete('/eliminar-servicio-usuario/:id',async(req,res)=>{
const IdS=req.params.id
console.log("Servicio borrado",IdS)
try{
  const conect= await mysql.createConnection(db)
  await conect.query('SELECT * FROM solicitudes WHERE solicitudes.id_solicitudes=?',[IdS])
  await conect.execute('DELETE FROM solicitudes WHERE solicitudes.id_solicitudes = ?',[IdS])
  res.status(200).send("Servicio Borrado")
  await conect.end();
}
catch(error){
  console.error('Error En El Servidor:',error);
 res.status(500).send('Error En El Servidor.. :c');
}
})















//------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//parte de administrador
app.post('/mostrar-usuarios',async(req,res)=>{
  const Documento=req.session.Documento;//esta  mal ahi  no va
  try{
    const conect= await mysql.createConnection(db)
const [obtusuario] = await conect.execute('SELECT * FROM usuario WHERE usuario.rol="usuario"',[Documento]); 
console.log(obtusuario);
  res.json({usuarios: obtusuario})
await conect.end()
  }
catch(error){
  console.error('Error En El Servidor:',error);
 res.status(500).send('Error En El Servidor.. :c');
}
})


// app.post('/editar-usuarios/:id_user',async(req,res)=>{
// const IdUs=req.params.id_user;
// try{
//   const conect= await mysql.createConnection(db);
//   const [Idu]= await conect.query('SELECT usuario.id_user FROM usuario WHERE usuario.id_user=?',[IdUs]);
//   const [EditarU]=await conect.execute('UPDATE usuario SET `Nombre`=?,`Tipo`=?,`Documento`=?,id_manzanas=? WHERE id_user=?',[Idu])
//   res.status(200).send("usuario editado")
//   console.log("holaa",EditarU)
// await conect.end();
// }
// catch(error){
//   console.error('Error En El Servidor:',error);
//  res.status(500).send('Error En El Servidor.. :c');
// }
// })

app.post('/editar-usuarios/:id_user', async (req,res)=>{
  const {Nombre, Tipo, Documento, id_manzanas, id_user} = req.body; 
  try{
  //Verificador de usuario
  const conect=await mysql.createConnection(db)
  const [indicador]=await conect.execute('SELECT * FROM usuario WHERE `Nombre`=? AND `Tipo`=? AND `Documento`=? AND id_manzanas=? AND id_user',[Nombre, Tipo, Documento, id_manzanas, id_user]);
  if(indicador.length>0){
    res.status(409).send(`
    <script>
    window.onload = function(){
      alert("Este Usuario Ya Existe");
      window.location.href = '/EditarUser.html';
    }
  </script>
    `)
  }
  else{
  await conect.execute('UPDATE usuario SET `Nombre`=?,`Tipo`=?,`Documento`=?,id_manzanas=? WHERE id_user=?',
  [Nombre, Direccion])
  res.status(201).send(`
  <script>
    window.onload = function(){
      alert("Usuario Editado ");
      window.location.href = '/admin.html'; 
    }
  </script>
  `)}
  await conect.end()
  }
  catch(error){
      console.error('Error en el servidor:', error);
      res.status(500).send(`
      <script>
        window.onload = function(){
          alert("Error En El Envío... :c");
          window.location.href = '/EditarUser.html';
        }
      </script>
      `)
      
  }
})



//borrar usuario
app.delete('/eliminar-usuario/:id_user',async(req,res)=>{
  const IdU=req.params.id_user;
  try{
    const conect= await mysql.createConnection(db);
    await conect.query('DELETE from solicitudes where id1=?',[IdU]);
    await conect.execute('DELETE FROM usuario WHERE usuario.id_user=?',[IdU])
    res.status(200).send("usuario borrado")
    console.log("holaa", IdU)
  await conect.end();
  }
  catch(error){
    console.error('Error En El Servidor:',error);
   res.status(500).send('Error En El Servidor.. :c');
  }
})
//Mostrar manzanas
app.post('/mostrar-manzanas',async(req,res)=>{
  const Documento=req.session.Documento;
  try{
    const conect= await mysql.createConnection(db)
    const [obtmanzana] = await conect.execute('SELECT * FROM manzanas WHERE manzanas.id_manzanas=id_manzanas ',[Documento].id_manzana)
    console.log("manzanasss",obtmanzana)
    res.json({manzanas: obtmanzana})

    await conect.end()
  }
  catch(error){
    console.error('Error En El Servidor:',error);
   res.status(500).send('Error En El Servidor.. :c');
  }
})

//crear manzana
app.post('/Manzanita', async (req,res)=>{
  const { Nombre,  Direccion} = req.body; 
  try{
  //Verificador de usuario
  const conect=await mysql.createConnection(db)
  const [indicador]=await conect.execute('SELECT * FROM manzanas WHERE `Nombre`=? AND `Direccion`=?',[Nombre,  Direccion]);
  if(indicador.length>0){
    res.status(409).send(`
    <script>
    window.onload = function(){
      alert("Este Manzana Ya Existe");
      window.location.href = '/Actualizar.html';
    }
  </script>
    `)
  }
  else{
  await conect.execute('INSERT INTO manzanas (`Nombre`, Direccion) VALUES (?, ?)',
  [Nombre, Direccion])
  res.status(201).send(`
  <script>
    window.onload = function(){
      alert("Manzana Registrada ");
      window.location.href = '/admin.html'; 
    }
  </script>
  `)}
  await conect.end()
  }
  catch(error){
      console.error('Error en el servidor:', error);
      res.status(500).send(`
      <script>
        window.onload = function(){
          alert("Error En El Envío... :c");
          window.location.href = '/Actualizar.html';
        }
      </script>
      `)
      
  }
})

//Mostrar los servicios 
app.post('/mostrar-servicios',async(req,res)=>{
  const Documento=req.session.Documento;
  const IdS=req.params.id_servicios;
  try{
    const conect= await mysql.createConnection(db)
const [obtservicio] = await conect.execute('SELECT * FROM servicios WHERE id_servicios=id_servicios',[Documento]); 
console.log(obtservicio);
  res.json({servicioss: obtservicio})
await conect.end()
  }
catch(error){
  console.error('Error En El Servidor:',error);
 res.status(500).send('Error En El Servidor.. :c');
}
})

//Crear Servicio
app.post('/Servicio', async (req,res)=>{
  const { Nombre,  Tipo} = req.body; 
  try{
  //Verificador de usuario
  const conect=await mysql.createConnection(db)
  const [indicador]=await conect.execute('SELECT * FROM servicios WHERE `Nombre`=? AND `Tipo`=?',[Nombre,  Tipo]);
  if(indicador.length>0){
    res.status(409).send(`
    <script>
    window.onload = function(){
      alert("Este Servicio Ya Existe");
      window.location.href = '/ActualizarServicio.html';
    }
  </script>
    `)
  }
  else{
  await conect.execute('INSERT INTO servicios (`Nombre`, `Tipo`) VALUES (?, ?)',
  [Nombre, Tipo])
  res.status(201).send(`
  <script>
    window.onload = function(){
      alert("Servicio Registrado ");
      window.location.href = '/admin.html'; 
    }
  </script>
  `)}
  await conect.end()
  }
  catch(error){
      console.error('Error en el servidor:', error);
      res.status(500).send(`
      <script>
        window.onload = function(){
          alert("Error En El Envío... :c");
          window.location.href = '/Actualizar.html';
        }
      </script>
      `)
  }
})


//Eliminar Servicio
app.delete('/eliminar-servicios/:id_servicios',async(req,res)=>{
  const IdS=req.params.id_servicios;
  try{
    const conect= await mysql.createConnection(db);
    await conect.execute('DELETE FROM manzana_servicios WHERE id_s=?',[IdS]);
    await conect.execute('DELETE FROM servicios WHERE servicios.id_servicios=?',[IdS])
    res.status(200).send("Servicio borrado")
    console.log(IdS)
  await conect.end();
  }
  catch(error){
    console.error('Error En El Servidor:',error);
   res.status(500).send('Error En El Servidor.. :c');
  }
})




//ruta para cerrar sesion
app.post('/cerrar-sesion',(req,res)=>{
  req.session.destroy((err)=>{
    if(err){
      console.error('error al cerrar sesion',err);
      res.status(500).send("error al cerrar la sesion")
    }
    else{
      res.status(200).send("sesion cerradaaa")
    }
  })
})



app.listen(3000, () => {
    console.log(`Servidor Node.js escuchando super deluxe`);
  }) 