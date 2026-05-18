app.use((req, res, next) => {
    res.locals.activePage = "";
    next();
});

app.get('/', function(req, res){
    res.render('index', { activePage: "index" });
});

app.get('/devicemap', function(req, res){
    res.render('devicemap', { activePage: "devicemap" });
});
app.get('/statistics', function(req, res){
    res.render('statistics', { activePage: "statistics" });
});
app.get('/settings', function(req, res){
    res.render('settings', { activePage: "settings" });
});