var express = require('express');
var router = express.Router();
const mariadb = require('mariadb');
const pool = mariadb.createPool({ host: 'localhost', user: 'someusername', database: 'mydb', connectionLimit: 5, port: 3306, password: 'somepassword' });

/* GET users listing. */
router.get('/predefined', async function (req, res, next) {
    let result = "No Result";
    let conn;
    try{
        conn = await pool.getConnection();
        const rows = await conn.query('select * from user');
        if(rows) result = rows[0];
        res.json({queryResponse: result});
    }catch (e) {
        console.log(e);
    }finally{
        if(conn) conn.end();
    }
});

router.post('/custom-query', function(req, res, next) {
    let result = "No Result"
    let conn = pool.getConnection()
        .then(conn => {
            result = conn.query(req.body.customQuery);
        })
        .catch(err => console.log(err));
    let datetime = new Date().toISOString()
    res.json({queryResponse: result});
});

module.exports = router;

/*
create table some_table
(
    id int auto_increment,
    constraint some_table_pk
primary key (id)
);*/
//create table some_table (id int auto_increment, constraint some_table_pk primary key (id));