const mysql = require("mysql");
const fs = require("fs");
const moment = require("moment");
const ejsUtils = require("../javascript/ejsUtils")

const { prepareTagList, handleChosenTags,
    prepareTagQuery, prepareProductTagConnectionQueries,
    matchTagNameWithProductTagRelationShip,
    convertListToString, formatUUID,
    createProductPackagesQuery, getPackagesExpirationDatesList,
    createUpdatePackagesQuery, formatCount,
    createAddPackageQuery, isolateProductIds,
    formatId, formatProductIdList, showCreateNewModal,
    formatPasswordHash, formatTheme, formatUsername } = require("../javascript/webutils");

class DBController {

    constructor() {

    }

    addProduct(req, res, con) {
        const { productName, productQuantity, imageChoice } = req.body;
        let insertedItemId = '';

        con.query("SELECT uuid() as uuid", function (err, result) {
            if (err) throw err;
            insertedItemId = formatUUID(result);

            console.log(`qty = ${mysql.escape(productQuantity)}`)
            let createRecordQuery = `INSERT INTO products (name, quantity, image, id, createdBy) VALUES (?, ?, ?, ?, ?)`;

            const selectedImage = imageChoice ? imageChoice : 'NULL';

            con.query(createRecordQuery, [productName, productQuantity, selectedImage, insertedItemId, req.user], function (err, result) {
                if (err) throw err;

                let createPackagesQuery = createProductPackagesQuery(mysql.escape(insertedItemId), mysql.escape(productQuantity));
                con.query(createPackagesQuery, function (err, result) {
                    if (err) throw err;

                    let tagList = prepareTagList(req.body);
                    let activeTagList = handleChosenTags(tagList);

                    if (activeTagList.length !== 0) {
                        let getTagsQuery = prepareTagQuery(activeTagList);
                        con.query(getTagsQuery, function (err, result) {
                            if (err) throw err;

                            let createProductTagRelQuery = prepareProductTagConnectionQueries(mysql.escape(insertedItemId), result);
                            con.query(createProductTagRelQuery, function (err, result) {
                                if (err) throw err;

                                res.redirect(`edit-product/${insertedItemId}`);

                            });
                        });
                    } else
                        res.redirect(`edit-product/${insertedItemId}`);
                });
            });
        });
    }

    deleteProduct(req, res, con) {
        const itemId = req.params.id;
        const deleteRelatedTagsQuery = `DELETE FROM product_tags WHERE product_id = ? ;`;
        const deletePackagesQuery = `DELETE FROM product_packages WHERE product_id = ? ;`;
        const deleteItemQuery = `DELETE FROM products WHERE id = ? ;`;
        con.query(deleteRelatedTagsQuery + deletePackagesQuery + deleteItemQuery, [itemId, itemId, itemId], function (err, result) {
            if (err) throw err;
            res.redirect("/all");
        });
    }

    addPackages(req, res, con) {
        const itemId = req.params.id;
        const { expirationDates } = req.body;

        const addPackageQuery = createAddPackageQuery(itemId, expirationDates);
        con.query(addPackageQuery, function (err, result) {
            if (err) throw err;
            const updateProductQuantityQuery = `UPDATE products SET quantity = quantity + ${expirationDates.length} WHERE id = '${itemId}'`;

            con.query(updateProductQuantityQuery, function (err, result) {
                if (err) throw err;
                res.redirect(`/edit-product/${itemId}`);
            })
        })
    }

    deletePackages(req, res, con) {
        const itemId = req.params.id;
        const { deletePackages } = req.body;
        const deletePackageQuery = `DELETE FROM product_packages WHERE id IN (${deletePackages});`

        con.query(deletePackageQuery, function (err, result) {
            if (err) throw err;
            let updateFoodQuantityQuery = `UPDATE products SET quantity = quantity - ${deletePackages.length} WHERE id = '${itemId}'`;

            con.query(updateFoodQuantityQuery, function (err, result) {
                if (err) throw err;
                res.redirect(`/edit-product/${itemId}`);
            })
        })
    }

    setThemePreference(req, res, con) {
        const colourTheme = req.body.colourTheme;
        const setThemePreferenceQuery = `UPDATE users SET theme = ? WHERE id = ?`;
        con.query(setThemePreferenceQuery, [colourTheme, req.user.id], function (err, result) {
            if (err) throw err;
            res.redirect("/login");
        })
    }

    updateThemePreference(req, res, con) {
        const selectedColor = req.body.colourTheme;
        const updateUserRecordQuery = `UPDATE users SET theme = ? WHERE id = ?;`;

        con.query(updateUserRecordQuery, [selectedColor, req.user], function (err, result) {
            if (err) throw err;
            res.redirect("/all");
        })
    }

    editProduct(req, res, con) {
        const itemId = req.params.id;
        const { foodName, foodQuantity, foodComments, numberOfPackages, imageChoice } = req.body;
        const tagList = prepareTagList(req.body);
        const activeTagList = handleChosenTags(tagList);
        const getTagsQuery = prepareTagQuery(activeTagList);

        const listOfDates = getPackagesExpirationDatesList(req.body);

        //update product
        let updateProductQuery = `UPDATE products SET name = ?, quantity = ?, comments = ?, image = ? WHERE id = ?`;
        con.query(updateProductQuery, [foodName, foodQuantity, foodComments, imageChoice, itemId], function (err, result) {
            if (err) throw err;
            //update related tags
            con.query(getTagsQuery, function (err, result) {
                if (err) throw err;
                let relatedTagList = result;
                if (relatedTagList.length === 0) {

                    con.query(`DELETE FROM product_tags WHERE product_id = ?`, [itemId], (err, result) => {
                        if (err) throw err;
                        // update packages
                        con.query(`SELECT COUNT(*) as count FROM product_packages WHERE product_id = ?; SELECT * FROM product_packages WHERE product_id = ?;`, [itemId, itemId], function (err, results) {
                            if (err) throw err;
                            const numberOfPackages = formatCount(results[0]);
                            let packageRecords = results[1];

                            if (!packageRecords || numberOfPackages === 0)
                                return res.redirect("/all");

                            if (numberOfPackages == foodQuantity) {
                                let updatePackagesExpirationsQuery = createUpdatePackagesQuery(listOfDates, packageRecords);
                                con.query(updatePackagesExpirationsQuery, function (err, result) {
                                    if (err) throw err;
                                    return res.redirect("/all");
                                })
                            } else if (numberOfPackages < foodQuantity) {
                                let packagesToCreate = foodQuantity - numberOfPackages;
                                let createNewProductPackagesRelsQuery = createProductPackagesQuery(mysql.escape(itemId), packagesToCreate);
                                con.query(createNewProductPackagesRelsQuery, function (err, result) {
                                    if (err) throw err;
                                    return res.redirect("/all");
                                });
                            } else {
                                con.query(`UPDATE products SET quantity = ? WHERE id = ?`, [foodQuantity, itemId], function (err, result) {
                                    if (err) throw err;
                                    return res.redirect("/all");

                                })
                            }
                        })
                    })
                }
                else {
                    //update related tags
                    const productTagRelationshipQuery = prepareProductTagConnectionQueries(mysql.escape(itemId), result);
                    con.query(`DELETE FROM product_tags WHERE product_id = ?; ${productTagRelationshipQuery}`, [itemId], function (err, result) {
                        if (err) throw err;

                        // update packages
                        con.query(`SELECT COUNT(*) as count FROM product_packages WHERE product_id = ?; SELECT * FROM product_packages WHERE product_id = ?;`, [itemId, itemId], function (err, results) {
                            if (err) throw err;
                            console.log(results[1]);
                            const numberOfPackages = formatCount(results[0]);
                            let packageRecords = results[1];

                            if (!packageRecords || numberOfPackages === 0)
                                return res.redirect("/all");

                            if (numberOfPackages == foodQuantity) {
                                console.log(`passing to method: ${itemId}, ${listOfDates},`)
                                console.log(packageRecords);
                                let updatePackagesExpirationsQuery = createUpdatePackagesQuery(listOfDates, packageRecords);

                                con.query(updatePackagesExpirationsQuery, function (err, result) {
                                    if (err) throw err;
                                    return res.redirect("/all");
                                })
                            } else if (numberOfPackages < foodQuantity) {
                                let packagesToCreate = foodQuantity - numberOfPackages;
                                let createNewProductPackagesRelsQuery = createProductPackagesQuery(mysql.escape(itemId), packagesToCreate);

                                con.query(createNewProductPackagesRelsQuery, function (err, result) {
                                    if (err) throw err;
                                    return res.redirect("/all");
                                });
                            } else
                                return res.redirect("/all");
                        })
                    });
                }
            });
        })
    }

    showTutorialPage(req, res, con) {
        const getUserThemeQuery = `SELECT username, theme FROM users WHERE id = ? ;`;
        const getAllProducts = `SELECT * FROM products WHERE createdBy = ? ;`;

        con.query(getUserThemeQuery + getAllProducts, [req.user, req.user], function (err, results, fields) {
            if (err) throw err;

            const userThemePreference = formatTheme(results[0]);
            const username = formatUsername(results[0]);
            const allProducts = results[1];

            const fileList = [];
            fs.readdir("public/images/", async (err, files) => {
                for (let file of files) {
                    if (file !== ".DS_Store")
                        fileList.push(file);
                }
                res.render('tutorial', { fileList: fileList, userThemePreference, username, allProducts });
            });
        })
    }

    showExpiringPage(req, res, con) {
        const getExpiringPackagesQuery = `SELECT products.name, product_packages.expiration  
        FROM product_packages 
        LEFT JOIN products ON product_packages.product_id = products.id 
        WHERE expiration < DATE_ADD(CURDATE(), INTERVAL 50 DAY) AND expiration > CURDATE() AND products.createdBy = ? 
        ORDER BY expiration ASC;`;

        const getExpiredPackagesQuery = `SELECT products.name, product_packages.expiration
        FROM product_packages
        LEFT JOIN products ON product_packages.product_id = products.id
        WHERE expiration <= CURDATE() AND expiration > DATE_SUB(CURDATE(), INTERVAL 15 DAY) AND products.createdBy = ?
        ORDER BY expiration DESC;`

        const getUserThemeQuery = `SELECT username, theme FROM users WHERE id = ?;`

        con.query(`SELECT * FROM products WHERE createdBy = ? ORDER BY name ASC; SELECT * FROM product_tags; SELECT * FROM tags;` + getExpiringPackagesQuery + getExpiredPackagesQuery + getUserThemeQuery,
            [req.user, req.user, req.user, req.user], function (err, results, fields) {
                if (err) throw err;
                const allProducts = results[0];
                const allTags = results[1];
                const allTagNames = results[2];
                const expiringPackages = results[3];
                const expiredPackages = results[4];
                const userThemePreference = formatTheme(results[5]);
                const username = formatUsername(results[5]);

                const fileList = [];
                fs.readdir("public/images/", async (err, files) => {
                    for (let file of files) {
                        if (file !== ".DS_Store")
                            fileList.push(file);
                    }
                    res.render('expiring', { allTags, allProducts, allTagNames, fileList: fileList, expiringPackages, moment, expiredPackages, userThemePreference, username });
                });
            })
    }

    showFilterPage(req, res, con) {
        const specifiedTag = req.query.category;
        if (specifiedTag === 'none')
            return res.redirect("/all");
        else {
            const getTagIdQuery = `SELECT id FROM tags WHERE name = ? LIMIT 1`;
            con.query(getTagIdQuery, [specifiedTag], function (err, result) {
                if (err) throw err;
                const specifiedTagId = formatId(result);
                const selectFilteredProductsQuery = `SELECT product_tags.id, product_tags.product_id, product_tags.tag_id,
                 products.id as productId, products.name, products.image FROM product_tags INNER JOIN products 
                 ON products.id = product_tags.product_id AND tag_id = ? WHERE products.createdBy = ? ;`

                con.query(selectFilteredProductsQuery, [specifiedTagId, req.user], function (err, result) {
                    if (err) throw err;
                    const allRelsWhereTagPresent = result;
                    const allProductIds = formatProductIdList(isolateProductIds(allRelsWhereTagPresent));
                    let getProductsToDisplayQuery = 'SELECT * FROM product_tags; SELECT * FROM tags;';
                    if (allProductIds)
                        getProductsToDisplayQuery += `SELECT * FROM products WHERE id IN (${allProductIds});`;
                    else
                        getProductsToDisplayQuery += `SELECT * FROM products WHERE id IN ('dummyText');`;

                    con.query(getProductsToDisplayQuery + `SELECT username, theme FROM users WHERE id = ?`, [req.user], function (err, results) {
                        if (err) throw err;
                        const allTags = results[0];
                        const allTagNames = results[1];
                        const filteredProducts = results[2];
                        const userThemePreference = formatTheme(results[3]);
                        const username = formatUsername(results[3]);

                        const fileList = [];
                        fs.readdir("public/images/", async (err, files) => {
                            for (let file of files) {
                                if (file !== ".DS_Store")
                                    fileList.push(file);
                            }
                            res.render('allProducts', { allProducts: filteredProducts, allTags, allTagNames, category: specifiedTag, fileList, userThemePreference, username });
                        });

                    })
                })
            })
        }
    }

    showEditProductPage(req, res, con) {
        const foodItemId = req.params.id;
        let foodItem = null;
        let tagNameListToBeDisplayed = null;
        let tagNameListToBeDisplayedString = null;


        con.query(`SELECT * FROM product_tags WHERE product_id = ? ; SELECT * FROM tags;
         SELECT id, product_id, CONCAT(expiration,'') as expiration 
         FROM product_packages WHERE product_id = ? ; SELECT username, theme FROM users WHERE id = ? ;`, [foodItemId, foodItemId, req.user], function (err, results, fields) {
            if (err) throw err;
            const productTagsRels = results[0];
            const allTagsNames = results[1];
            const allPackages = results[2];
            const userThemePreference = formatTheme(results[3]);
            const username = formatUsername(results[3]);

            tagNameListToBeDisplayed = matchTagNameWithProductTagRelationShip(productTagsRels, allTagsNames);

            tagNameListToBeDisplayedString = convertListToString(tagNameListToBeDisplayed);


            const getFoodItemQuery = `SELECT * FROM products WHERE id = ?; SELECT * FROM products ORDER BY name ASC;`;
            con.query(getFoodItemQuery, [foodItemId], function (err, results, fields) {
                if (err) throw err;
                foodItem = results[0];
                const allProducts = results[1];


                const fileList = [];
                fs.readdir("public/images/", async (err, files) => {
                    for (let file of files) {
                        if (file !== ".DS_Store")
                            fileList.push(file);
                    }
                    res.render("editProduct", { foodItem, tagNameListToBeDisplayed, allPackages, allProducts, fileList, userThemePreference, username });

                });
            });
        });
    }

    showHomePage(req, res, con) {
        let allProducts = null;
        let allTags = null;
        let allTagNames = null;

        con.query(`SELECT * FROM products WHERE createdBy = ? ORDER BY name ASC; SELECT * FROM product_tags; 
        SELECT * FROM tags; SELECT username, theme FROM users WHERE id = ? ;`, [req.user, req.user], function (err, results, fields) {
            if (err)
                throw err;
            allProducts = results[0];
            allTags = results[1];
            allTagNames = results[2];

            const userThemePreference = formatTheme(results[3]);
            const username = formatUsername(results[3]);

            const fileList = [];
            fs.readdir("public/images/", async (err, files) => {
                for (let file of files) {
                    if (file !== ".DS_Store")
                        fileList.push(file);
                }
                res.render('allProducts', { allTags, allProducts, allTagNames, fileList: fileList, ejsUtils, userThemePreference, username });
            });


        })
    }
}

module.exports = DBController