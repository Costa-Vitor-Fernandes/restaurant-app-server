const cool = require('cool-ascii-faces');
const express = require('express')
const path = require('path')
const app = express();
const PORT = process.env.PORT || 5000
const cors = require('cors')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require("mysql2")
const xl = require('excel4node')

const databaseName= "YOURDATABASENAMEONHEROKU"


// git add .
// git commit -m "mensagem"
// git push heroku main
// heroku open /nome
app
  .use(cors())
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/cool', (req, res) => res.send(cool()))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
  
  const db = mysql.createPool({
    host: "YOURHOST",
    user: "YOURUSER",
    password: "YOURPASSWORD",
    database: databaseName,   
    port: "3306"
    //aqui a porta que ta o meu server mysql
})
app.use(cors())
app.use(express.json());

function verifyJWT(req, res, next){ 
  var token = req.body.token

  if (!token) 
      return res.status(401).send({ auth: false, message: 'Token não informado.' }); 
  
  jwt.verify(token, process.env.SECRET, function(err, decoded) { 
      if (err) 
          return res.status(500).send({ auth: false, message: 'Token inválido.' }); 
      next(); 
  }); 
}    



  app.get('/produto', (req, res) => {
    db.query(`SELECT * FROM ${databaseName}.products`, function (err, result, fields ){
      res.json({result})
      // console.log(result)
    })
  })
         

//==============================================================================================================================
// POST POST POST POST POST POST POST POST POST POST POST POST POST POST POST POST POST POST POST POST POST POST POST POST POST 

//registering
app.post('/create', verifyJWT, async (req,res)=>{
    
  const password =  req.body.password
  const username = req.body.username
  const email = req.body.email    
  // console.log("trying to create user in database")
try{

  db.query(`SELECT * FROM ${databaseName}.users` , async function (err, result, fields) {
      //  if (err) throw new Error(err)
      const allUsers = result.map((r)=> r.username)
      const allEmails = result.map((r)=> r.email)
      if(allUsers.includes(username.toString()) || allEmails.includes(email)) return res.send("esse jatem")
      if(!allUsers.includes(username) || !allEmails.includes(email)){
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(`creating user ${username}`)
        //this is giving an error, that shuts down the server, but it automatically goes up again
       const insert = db.query(`INSERT INTO ${databaseName}.users (username, email, password) VALUES ('${username}', '${email}', '${hashedPassword}')`)
        res.end(`creating user ${username} in the server`)
        return insert
    }
  })
}   
  catch{
      res.status(500).send('deu ruim')
  }
})

//login plus jwt
app.post('/login', (req, res)=>{
  console.log('login')
  const password =  req.body.password
  const username = req.body.username
  const email = req.body.email
  const hashedPassword = ""
  try{
      const queryval = `SELECT * FROM ${databaseName}.users WHERE username="${username}"` 
      db.query(queryval, async function (err, result, fields) {
          if (err) throw new Error(err)
          const resultPassword = result.map((r)=>r.password)
          const compare = await bcrypt.compare(password.toString(), resultPassword.toString()) 
          if(compare){
          const id = result.map(r=>r.id)
          const token = jwt.sign({id}, process.env.SECRET, {
          expiresIn: 43200 // expires in 12h
          });
          return res.json({ auth: true, token: token})
      }
        res.status(500).json({message: 'Login inválido!'})
      })
  }
  catch{
      res.status(500).send('deu ruim 500')
  }

})



//cadastro de produtos
app.post('/addProduct', verifyJWT,(req, res)=>{
  try{
      const nome = req.body.nomeproduto
      const preco = req.body.preco
      // console.log(username, nome, preco)
      // console.log(`${username}pode adicionar o produto${nome}`);
  res.status(201).send("adicionando no banco")
  
  const insert = db.query(`INSERT INTO ${databaseName}.products (nomeproduto, preco) VALUES ('${nome}', '${preco}')`)
  return insert
}
  catch{
      res.status(500)
  }
})

// add a order
app.post("/addToComanda", verifyJWT, function (req,res){
  const nomeproduto = req.body.nomeproduto
  const quantidade = req.body.quantidade
  const cliente = req.body.cliente


  db.query(`INSERT INTO ${databaseName}.comanda (nomeproduto, quantidade, cliente, preco) VALUES ('${nomeproduto}','${quantidade}','${cliente}', (SELECT preco FROM ${databaseName}.products WHERE nomeproduto='${nomeproduto}'))`)
  res.send("checar se adicionou em get")
})

app.post("/encerrarComanda", verifyJWT, function (req,res){
 const cliente = req.body.cliente
 const pagamento =  req.body.pagamento 
 const id = req.body.id

 db.query(`UPDATE ${databaseName}.comanda SET status="1", pagamento="${pagamento}" WHERE idpedido=${id}`)
 res.send(`comanda do cliente ${cliente} foi paga com ${pagamento}`)

})
app.post('/updateQuantidade', verifyJWT, function(req,res){
  const quantidade = req.body.quantidade
  const id = req.body.id

db.query(`UPDATE ${databaseName}.comanda SET quantidade=${quantidade} WHERE idpedido=${id}`)
res.send(`pedido de id numero ${id} foi alterado`)
})

app.post("/editarPrecoProduto", verifyJWT, function(req,res){
  const nomeproduto= req.body.nomeproduto
  const novoPreço = req.body.preco
  db.query(`UPDATE ${databaseName}.products SET preco="${novoPreço}" WHERE nomeproduto="${nomeproduto}" `)
})

// ==============================================================================================================================
// GET GET GET GET GET GET GET GET GET GET GET GET GET GET GET GET GET GET GET GET GET GET GET GET GET 

// read all products
app.get("/allProducts", (req,res)=>{
  db.query(`SELECT * FROM ${databaseName}.products`, function (err,result,fields){

  const obj ={
      nomeproduto: result.map(r=>r.nomeproduto),
      preco : result.map(r=>r.preco)
  }
  
  res.json(obj) 
  })
})


app.get("/todosClientesAbertos", (req,res)=>{
  db.query(`SELECT * FROM ${databaseName}.comanda WHERE status='0' `, function(err,result,fields){
      // res.json cada cliente
      const obj =  result.map(r=>r.cliente)
      //separa por unico 
      const cadaCliente = [...new Set(obj)]

      res.json(cadaCliente)

  })
})
app.get("/todosClientesFechados", (req,res)=>{
  db.query(`SELECT * FROM ${databaseName}.comanda WHERE status='1' `, function(err,result,fields){
      // res.json cada cliente
      const obj =  result.map(r=>r.cliente)
      //separa por unico 
      const cadaCliente = [...new Set(obj)]

      res.json(cadaCliente)

  })
})


// gets all orders
app.get("/todasComandas", (req,res)=>{
  db.query(`SELECT * FROM ${databaseName}.comanda`, function (err,result,fields){
      console.log(result.map(r=>r.idpedido))
      console.log(result.map(r=>r.nomeproduto))
      console.log(result.map(r=>r.quantidade))
      console.log(result.map(r=>r.cliente))
      console.log(result.map(r=>r.preco))
  })
})
app.get("/todasComandasAbertas", (req,res)=>{
  db.query(`SELECT * FROM ${databaseName}.comanda WHERE status='0'`, function (err,result,fields){
      // console.log(result.map(r=>r.idpedido))
      // console.log(result.map(r=>r.nomeproduto))
      // console.log(result.map(r=>r.quantidade))
      // console.log(result.map(r=>r.cliente))
      // console.log(result.map(r=>r.preco))
      const obj = {
          id: result.map(r=>r.idpedido),
          nomeproduto: result.map(r=>r.nomeproduto),
          quantidade: result.map(r=>r.quantidade),
          cliente: result.map(r=>r.cliente),
          preco:result.map(r=>r.preco)   
      }
      res.json(obj)
  })
})

// get all orders from 1 customer
// adicionar verifyJWT como middleware depois
// req.query to axios.get("") {params: {params}}
app.get("/comandaCliente", (req,res)=>{
  const cliente = req.query.cliente
  // req.query.cliente pro axios...
  console.log(cliente)

  
  // talvez eu deva implementar aqui o status = 0 pra nao pagas e fazer
  // outra rota so pra pagos
  db.query(`SELECT * FROM ${databaseName}.comanda WHERE cliente="${cliente}" AND status=0 `, function (err,result,fields){
      // console.log(result.map(r=>r.idpedido))
      // console.log(result.map(r=>r.nomeproduto))
      // console.log(result.map(r=>r.preco))
      // console.log(result.map(r=>r.quantidade))
      const obj ={
          id: result.map(r=>r.idpedido),
          nomeproduto: result.map(r=>r.nomeproduto),
          quantidade: result.map(r=>r.quantidade),
          preco:result.map(r=>r.preco)
      }
      res.json(obj)
      // retornar os ids dos pedidos com res send json 
  })

})
app.get("/comandaFechadaCliente", (req,res)=>{
  const cliente = req.query.cliente
  // req.query.cliente pro axios...
  // console.log(cliente)

  
  // talvez eu deva implementar aqui o status = 0 pra nao pagas e fazer
  // outra rota so pra pagos
  db.query(`SELECT * FROM ${databaseName}.comanda WHERE cliente="${cliente}" AND status=1 `, function (err,result,fields){
      // console.log(result.map(r=>r.idpedido))
      // console.log(result.map(r=>r.nomeproduto))
      // console.log(result.map(r=>r.preco))
      // console.log(result.map(r=>r.quantidade))
      const pagamento = [...new Set(result.map(r=>r.pagamento))]
      const obj ={
          id: result.map(r=>r.idpedido),
          nomeproduto: result.map(r=>r.nomeproduto),
          quantidade: result.map(r=>r.quantidade),
          preco:result.map(r=>r.preco),
          pagamento:pagamento
      }
      res.json(obj)
      // retornar os ids dos pedidos com res send json 
  })

})

app.get("/todosPedidosPorId", (req,res)=>{

  db.query(`SELECT * FROM ${databaseName}.comanda`, (err,result, fields)=>{
      const obj ={
          id: result.map(r=>r.idpedido),
          nomeproduto: result.map(r=>r.nomeproduto),
          quantidade: result.map(r=>r.quantidade),
          preco:result.map(r=>r.preco),
          status:result.map(r=>r.status)
      }
      res.json(obj)
  })
})


//===========================================================================================================================
// DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE 


//delete cadastro de produto
app.delete("/deleteProduct", verifyJWT, (req,res) =>{
//db query delete product where req.body.product
const produto =  req.body.nomeproduto
db.query(`DELETE FROM ${databaseName}.products WHERE nomeproduto='${produto}'`)
res.send("checa produtos se deu certo")
})

//delete pedido errado
app.delete("/deletePedido", verifyJWT, (req,res)=>{
  const idpedido = req.body.idpedido
  db.query(`DELETE FROM ${databaseName}.comanda WHERE idpedido='${idpedido}'`)
  console.log('check')
  res.send('pedido excluido')
})

//deleta a comanda em aberto
app.delete('/comandaFechada', verifyJWT, (req,res)=>{
  const cliente = req.body.cliente
  db.query(`DELETE FROM ${databaseName}.comanda WHERE cliente="${cliente}"`)
})

app.delete('/DeleteTodasComandasFechadas', verifyJWT, (req,res)=>{
  db.query(`DELETE FROM ${databaseName}.comanda WHERE status='1'`)
})


//===========================================================================================================================
//  TESTING SECTION TESTING SECTION TESTING SECTION TESTING SECTION TESTING SECTION TESTING SECTION TESTING SECTION 



app.get('excelTodasComandas', (req,res)=>{
db.query(`SELECT * ${databaseName}.comanda`)

})



app.get('/excelComandasFechadas', (req,res)=>{
  
  db.query(`SELECT * FROM ${databaseName}.comanda WHERE status=1;`, (err,result,fields)=>{
     
     
      const obj ={
          id: result.map(r=>r.idpedido.toString()),
          nomeproduto: result.map(r=>r.nomeproduto),
          quantidade: result.map(r=>r.quantidade.toString()),
          preco:result.map(r=>r.preco.toString()),
          status:result.map(r=>r.status.toString()),
          pagamento:result.map(r=>r.pagamento),
          hora: result.map(r=>r.create_time.toString())
      }
      const keys = Object.keys(obj)
      const entries = Object.values(obj)
      
      var wb = new xl.Workbook();


  // Add Worksheets to the workbook
      var ws = wb.addWorksheet('28 de maio');


      for (let i=1; i<=keys.length; i++){
          
          console.log(i)
          console.log(keys[i-1])
          ws.cell(1,i)
          .string(keys[i-1])
          
          for (let j =2 ;j<=entries[0].length+1;j++){
              
              console.log(entries[0].length, j)
              ws.cell(j, i)
              .string(entries[i-1][j-1])
          }
      }

      // ws.cell(2,1)
      // .string('string2')
    

      wb.write('Excel.xlsx');
      const file = __dirname + `testes/server/Excel.xlsx`;
      const fileName = 'Excel.xlsx';
const fileUrl = `http://localhost:${PORT}/${fileName}`;
const filePath = path.join(__dirname, fileName);
      setTimeout(()=>{

          res.download(filePath); // Set disposition and send it.
      },200)
  })

})

// add mais coisas nessas planilhas, como formulas de total, datas dinamicas entre outros

app.get('/excelTodasComandas', (req,res)=>{
  
  db.query(`SELECT * FROM ${databaseName}.comanda;`, (err,result,fields)=>{
     
     
      const obj ={
          id: result.map(r=>r.idpedido.toString()),
          nomeproduto: result.map(r=>r.nomeproduto),
          quantidade: result.map(r=>r.quantidade.toString()),
          preco:result.map(r=>r.preco.toString()),
          status:result.map(r=>r.status.toString()),
          pagamento:result.map(r=>r.pagamento),
          hora: result.map(r=>r.create_time.toString())
      }
      const keys = Object.keys(obj)
      const entries = Object.values(obj)
      
      var wb = new xl.Workbook();


  // Add Worksheets to the workbook
      var ws = wb.addWorksheet('28 de maio');


      for (let i=1; i<=keys.length; i++){
          
          console.log(i)
          console.log(keys[i-1])
          ws.cell(1,i)
          .string(keys[i-1])
          
          for (let j =2 ;j<=entries[0].length+1;j++){
              
              console.log(entries[0].length, j)
              ws.cell(j, i)
              .string(entries[i-1][j-1])
          }
      }



      wb.write('Excel.xlsx');
      const file = __dirname + `testes/server/Excel.xlsx`;
      const fileName = 'Excel.xlsx';
const fileUrl = `http://localhost:${PORT}/${fileName}`;
const filePath = path.join(__dirname, fileName);

setTimeout(()=>{

  res.download(filePath); // Set disposition and send it.
},200)
})
 
})



      

