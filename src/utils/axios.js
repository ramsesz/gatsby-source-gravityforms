const axios = require(`axios`)
const chalk = require(`chalk`)
const oauthSignature = require(`oauth-signature`)

const { routes } = require(`./routes`)
const { isObjEmpty, slugify } = require(`./helpers`)
const { new0AuthParameters } = require(`./oAuthParameters`)

const log = console.log

// Get list of all forms from GF
async function getForms(basicAuth, api, baseUrl) {
    log(chalk.black.bgWhite(`Fetching form ids`))

    const authParams = new0AuthParameters(api.key)

    let result

    try {
        const signature = oauthSignature.generate(
            `GET`,
            baseUrl + routes.wp + routes.gf + routes.forms,
            authParams,
            api.secret
        )

        result = await axios.get(
            baseUrl + routes.wp + routes.gf + routes.forms,
            {
                responseType: `json`,
                params: {
                    ...authParams,
                    oauth_signature: signature,
                },
                auth: basicAuth,
            }
        )
    } catch (err) {
        apiErrorHandler(err)
        // Kill the plugin
        return false
    }

    return result.data
}

// Get form fields from GF
async function getFormFields(basicAuth, api, baseUrl, form) {
    log(chalk.black.bgWhite(`Fetching fields for form ${form.id}`))

    const authParams = new0AuthParameters(api.key)

    let result

    const apiURL =
        baseUrl + routes.wp + routes.gf + routes.forms + `/` + form.id

    // Make a new signature
    const signature = oauthSignature.generate(
        `GET`,
        apiURL,
        authParams,
        api.secret
    )

    console.log(signature)

    try {
        result = await axios.get(
            baseUrl + routes.wp + routes.gf + routes.forms + `/` + form.id,
            {
                responseType: `json`,
                params: {
                    ...authParams,
                    oauth_signature: signature,
                },
                auth: basicAuth,
            }
        )
    } catch (err) {
        apiErrorHandler(err)
        // Kill the plugin
        return false
    }

    result.data[`slug`] = slugify(form.title)
    result.data[`apiURL`] = apiURL

    return result.data
}

async function getFormsAndFields(basicAuth, api, baseUrl) {
    const formObj = {}

    // First get forms in list
    const allForms = await getForms(basicAuth, api, baseUrl)

    // If there are forms to move with
    if (allForms) {
        if (!isObjEmpty(allForms)) {
            for (const [key, value] of Object.entries(allForms)) {
                // Clone form object
                const currentForm = { ...allForms[key] }

                // remove unneeded key
                delete currentForm.entries

                const form = await getFormFields(
                    basicAuth,
                    api,
                    baseUrl,
                    currentForm
                )

                formObj[`form-` + currentForm.id] = form
            }
        } else {
            log(chalk.bgRed(`We could not find any forms. Have you made any?`))
        }

        return formObj
    }
    return false
}

function apiErrorHandler(error) {
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        log(chalk.bgRed(`Request was made, but there was an issue`))
        log(error.response.data)
        log(error.response.status)
        log(error.response.headers)
    } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        log(chalk.bgRed(`Request was made, but no response`))
        log(error.request)
    } else {
        // Something happened in setting up the request that triggered an Error
        log(chalk.bgRed(`Something happened setting up the request`))
        log(`Error`, error)
    }
}

module.exports = {
    getFormsAndFields,
}
