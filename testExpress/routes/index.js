
/*
 * GET home page.
 */

exports.index = function(req, res){

  res.render('index', { title: JSON.stringify(req.url)});

};

exports.management = function(req, res){

	res.render('management', { data: {agentAddress: "call here for info"} }); //TODO: put address of management agent here, will be relayed to page's javascript
};
