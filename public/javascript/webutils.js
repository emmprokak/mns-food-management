count = 1;

function getItemId(deleteButtonReference) {
    const itemId = deleteButtonReference.id;
    let completeUrl = window.location.href;
    if (completeUrl.includes("all")) {
        completeUrl = completeUrl.slice(0, completeUrl.length - 3);
    }
    console.log(`delete button of ${itemId} clicked on this url ${completeUrl}`);
    window.history.pushState("object or string", "Title", `${completeUrl}${itemId}`);
}

function getCurrentURL() {
    let completeUrl = window.location.href;
    console.log(`complete url is getCurrent is ${completeUrl} and length is ${completeUrl.length} and I cut at ${completeUrl.indexOf(":3000/") + 6}`);
    const itemId = completeUrl.slice(completeUrl.indexOf(".com/") + 4, completeUrl.length);
    console.log(`current url = ${completeUrl}`);
    console.log(`itemId of product to be deleted: ${itemId}`);
    document.getElementById("delete-form").action = `/delete-item/${itemId}`;
}

function resetURL() {
    let currentUrl = window.location.href;
    window.location.href = currentUrl.slice(0, currentUrl.indexOf(".com/") + 4);
}

function setFocusTo(elementId) {
    console.log(`element id is ${elementId}`);
    document.querySelector(elementId).focus();
}

function submitEditForm() {
    const form = document.getElementById('edit-form');
    form.submit();
}

module.exports = {
    handleChosenTags: function (tagList) {
        const resultingTagList = tagList.filter(element => element !== undefined);
        return resultingTagList;
    },
    prepareTagList: function (reqBody) {
        const { essential, vegetables, fruit, meat, dairy, frozen, fresh, luxury, candy, healthy } = reqBody;
        return [essential, vegetables, fruit, meat, dairy, frozen, fresh, luxury, candy, healthy];
    },
    prepareTagQuery: function (tagList) {
        let queryString = 'SELECT id, name FROM tags WHERE name IN ';
        let tagListString = '(';

        //empty tagList
        if (tagList.length === 0)
            return `${queryString}('nothing');`;


        for (let i = 0; i < tagList.length; i++) {
            tagListString += `'${tagList[i]}'`;

            if (i === tagList.length - 1)
                break;

            tagListString += ', ';
        }

        tagListString += ');';
        queryString += tagListString;
        console.log(`final tag query = ${queryString}`)
        return queryString;
    },
    prepareProductTagConnectionQueries: function (productId, tagList) {
        let queryString = 'INSERT INTO product_tags (product_id, tag_id, id) VALUES ';
        console.log(`taglist in prepare = ${tagList}`)
        let tagId = '';

        for (let i = 0; i < tagList.length; i++) {
            tagId = tagList[i].id;
            queryString += `(${productId}, ${tagId}, uuid())`;

            if (i === tagList.length - 1)
                break;
            queryString += ', ';
        }

        return `${queryString};`
    },
    matchTagNameWithProductTagRelationShip: function (tagRels, tagNames) {
        const listOfTagNamesToBeDisplayed = [];
        for (let tagRel of tagRels) {
            for (let tagName of tagNames) {
                if (tagRel.tag_id === tagName.id) {
                    listOfTagNamesToBeDisplayed.push(tagName.name);
                }
            }
        }
        return listOfTagNamesToBeDisplayed;
    },
    convertListToString: function (list) {
        let unifiedString = '';
        for (let item of list) {
            unifiedString += `${item};`
        }
        return unifiedString;
    },
    formatUUID: function (queryResult) {
        for (let item of queryResult) {
            return item.uuid;
        }
    },
    formatId: function (queryResult) {
        for (let item of queryResult) {
            return item.id;
        }
    },
    formatTheme: function (queryResult) {
        for (let item of queryResult) {
            return item.theme;
        }
    },
    createProductPackagesQuery: function (productId, numberOfPackages) {
        const numberOfPackagesInt = parseInt(numberOfPackages.replace(`'`, ''));

        if (numberOfPackagesInt <= 0)
            return 'SELECT 1 WHERE false'; // does nothing

        let basicQueryString = 'INSERT INTO product_packages (product_id) VALUES ';
        for (let i = 0; i < numberOfPackagesInt; i++) {
            basicQueryString += `(${productId})`;
            if (i !== numberOfPackagesInt - 1)
                basicQueryString += ', ';
        }
        return `${basicQueryString};`

    },
    createUpdatePackagesQuery: function (listOfDates, listOfPackages) {

        let finalQueryString = '';
        const packageRecordIds = recordsToIdList(listOfPackages);
        for (let i = 0; i < listOfDates.length; i++) {
            let dateValue = listOfDates[i];
            if (!dateValue)
                finalQueryString += `UPDATE product_packages SET expiration = NULL WHERE id = ${packageRecordIds[i]};`;
            else
                finalQueryString += `UPDATE product_packages SET expiration = '${dateValue}' WHERE id = ${packageRecordIds[i]};`;

        }
        return finalQueryString;
    },
    createAddPackageQuery: function (productId, expirationDateList) {
        let queryString = 'INSERT INTO product_packages (product_id,expiration) VALUES ';
        console.log(expirationDateList);
        for (let i = 0; i < expirationDateList.length; i++) {
            if (!expirationDateList[i])
                queryString += `('${productId}', NULL)`;
            else
                queryString += `('${productId}', '${expirationDateList[i]}')`;

            if (i !== expirationDateList.length - 1)
                queryString += ',';

        }

        return queryString;
    },
    getPackagesExpirationDatesList: function (requestBody) {
        return requestBody.packageDates;
    },
    formatCount: function (queryResult) {
        if (!queryResult) return 0;
        for (let item of queryResult) {
            return item.count;
        }
    },
    isolateProductIds: function (productTagRels) {
        const productsIds = [];
        for (let item of productTagRels) {
            productsIds.push(item.productId);
        }
        return productsIds;
    },
    formatProductIdList: function (listOfProductIds) {
        let formattedList = '';
        for (let i = 0; i < listOfProductIds.length; i++) {
            formattedList += `'${listOfProductIds[i]}'`;
            if (i !== listOfProductIds.length - 1)
                formattedList += ',';
        }
        return formattedList;
    },
    showCreateNewModal: function () {
        const createNewModal = new bootstrap.Modal(document.getElementById('new-modal'), {});
        createNewModal.toggle()
    },
    formatPasswordHash: function (objectList) {
        for (let item of objectList) {
            return item.password;
        }
    },
    formatUsername: function (objectList) {
        for (let item of objectList) {
            return item.username;
        }
    },
    formatUsername: function (object) {
        for (let item of object) {
            return item.username;
        }
    },
    getScreenWidth: function () {
        return screen.width;
    }
};

function findAndUpdateTagCheckboxes(tagToBeChecked) {
    const checkBox = document.getElementById(tagToBeChecked);
    checkBox.checked = true;
}

function recordsToIdList(queryResult) {
    const idList = [];
    for (let item of queryResult) {
        idList.push(item.id);
    }
    return idList;
}

function renderUpdateQuantityWizard(buttonPressed) {
    const currentStep = document.querySelector('#currentStepCounter');
    if (currentStep.innerHTML < 3)
        currentStep.innerHTML = parseInt(currentStep.innerHTML) + 1;

    if (checkSubmitPackageForm(buttonPressed, currentStep)) return;

    if (document.querySelector("#add").checked === true && parseInt(currentStep.innerHTML) === 2) {
        document.querySelector('#screen-1-2').style = 'display:inline;';
        document.querySelector('#screen-1').style = 'display:none;';
        document.querySelector('#next').innerHTML = 'Add Package';

    } else if (document.querySelector('#remove').checked === true && parseInt(currentStep.innerHTML) === 2) {
        document.querySelector('#select-deletion-message').style = 'display: none';
        document.querySelector('#screen-2').style = 'display:inline;';
        document.querySelector('#screen-1').style = 'display:none;';
        document.querySelector('#next').innerHTML = 'Delete Packages';
    } else {
        document.querySelector('#select-deletion-message').style = 'display: inline';
        document.querySelector('#screen-success').style = 'display: inline';
    }
}

function checkSubmitPackageForm(buttonPressed, currentStep) {
    if (buttonPressed.id === 'next' && document.querySelector('#add').checked === true && parseInt(currentStep.innerHTML) === 3) {
        const addPackageForm = document.querySelector('#form-add-package');
        const qtyField = document.querySelector('#foodQuantity');
        let currentQuantityValue = qtyField.value;
        qtyField.value = parseInt(currentQuantityValue) + 1
        addPackageForm.submit();
        return true;

    } else if (buttonPressed.id === 'next' && document.querySelector('#remove').checked === true && parseInt(currentStep.innerHTML) === 3) {
        const removePackageIds = getSelectedPackageIds();
        if (!removePackageIds.length)
            return;

        const qtyField = document.querySelector('#foodQuantity');
        let currentQuantityValue = qtyField.value;
        qtyField.value = parseInt(currentQuantityValue) - removePackageIds.length;
        let removePackageForm = document.querySelector("#form-remove-package");
        // removePackageForm = prepareFormForSubmit(removePackageForm, removePackageIds);
        removePackageForm.submit();
        return true;

    } else
        return false;
}

function checkDisableRemoveOption() {
    const noPackagesWarning = document.querySelector('#noPackagesWarning');
    console.log(noPackagesWarning);
    if (noPackagesWarning) {
        document.querySelector('#remove').setAttribute('disabled', '');
        document.querySelector('#remove-label').style = 'color : gray';
    } else {
        document.querySelector('#remove').removeAttribute('disabled');
        document.querySelector('#remove-label').style = 'color : black';
    }

}

function getSelectedPackageIds() {
    const selectedPackages = [];
    const selectPackageScreen = document.querySelector('#screen-2');
    const allPackageOptions = selectPackageScreen.querySelectorAll('input');
    for (let packageOption of allPackageOptions) {
        let packageOptionId = packageOption.id;

        if (packageOption.checked)
            selectedPackages.push(packageOptionId.slice(8, packageOption.length));
    }
    return selectedPackages;
}

function resetUpdateQuantityWizardStepCounter() {
    const currentStep = document.querySelector('#currentStepCounter');
    currentStep.innerHTML = 1;
    document.querySelector('#screen-1').style = 'display: inline';
    document.querySelector('#screen-1-2').style = 'display: none';
    document.querySelector('#screen-2').style = 'display: none';
    document.querySelector("#add").checked = true;
    document.querySelector('#next').innerHTML = 'Next';
    checkDisableRemoveOption();
}

function addPackage() {
    const div = document.querySelector("#add-package-container");
    div.innerHTML = div.innerHTML + `<input type="date" class="mt-2 mx-1 py-1 px-1" id="expirationDates-${this.count}" name="expirationDates[${this.count++}]"
    value="expirationDateInput">`

    const titleHeader = document.querySelector("#expiration-question-subject");
    titleHeader.innerHTML = 'packages';

    document.querySelector('#next').innerHTML = 'Add Packages';
}

function changeAccentColor(colorName) {
    const rootElement = document.querySelector(':root');
    rootElement.style.setProperty('--accentColor', colorName);
}


function enableApplyThemeButton() {
    const button = document.querySelector('#apply-theme');
    if (button) {
        button.removeAttribute('disabled');
    }
}

function getCurrentYear() {
    const date = new Date();
    return date.getFullYear();
}

