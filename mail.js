import OpenAI from "openai";
import readlinesync from 'readline-sync'
import axios from 'axios'
import sendmail from "./sendmail.js";
import {PrismaClient} from "@prisma/client";
import { SarvamAIClient } from "sarvamai";

//
//avnadmin
const prisma = new PrismaClient()
const sarvamclient = new SarvamAIClient({
    apiSubscriptionKey:sarvamkey
})
const client = new OpenAI({
    apiKey:geminikey,
    baseURL:'https://generativelanguage.googleapis.com/v1beta/openai/',
})
//sk_rzrvbw2g_II9QPeaILK33qBZyWSGKFKOc
let messages = [{role:'system',content:`
    YOU ARE AN AI AGENT WHICH WORKS FOR sending mail to user from the given prompt.
    You get two required fields from the prompt-
    1.usermail id OR the name of user
    2.body and data of mail to be sent

    Available tools:
    1.getuserid
    2.sendmailtouser
    3.askuser
    4.checkandinserttodb
    5.checkauth
    6.newuser
    7.aiquestion
    
    Now, your response must be strictly in JSON format without any unnecessary information.
    structure of response:{role:'Response',type:function/output,content:output or functionname}
    Important-1.Function and function name is available tools

    Important Flow of context-
    There is two windows in the conversation:
    (i).Auth window-Where User authentication is performed.
        Without passing it, you should not make the user perform mail operations.
    (ii).Mail service window-Where after authentication user performs all mail operations
    ==>Tools corresponding to Auth window-
        5.checkauth
        6.newuser
        7.aiquestion
    ==>Tools corresponding to Mail service window-
        1.getuserid
        2.sendmailtouser
        3.askuser
        4.checkandinserttodb
    Auth window flow ==>
        CASE-1:User enter its usermail and password
            example:-Your Response:-{role:'Response',type:'function',content:'Auth',function_name:'checkauth',inputs:[<usermail>,<password>]}
                    Next message:-{role:'user',content:{type:'function_result',function_name:'checkauth',content:0/1/2}}
                    So,Here content=0 signify,user not found so you should response with-{role:'Response',type:'function',content:'Auth',function_name:'newuser',inputs:[<usermail>,<password>]},
                    After newuser function response from user you should allow the mail service to be active
                    If,content=1 signify, user was found and password was matched so you just allow the mail service to be active
                    your response should be like this after auth-->
                    {role:'Response',type:'output',content:<Whatever you want to write auth done successfull whatever>,output_code:'1'}
                    Very Very Important-
                    For auth output response, you have to add additonal field output_code:'0',
                    And for successfull mail service completion like mail sent succesfully it should be output_code:'1'
                    Remember it!

                    If,content=2 signify, user was found but password was not matched,so you call aiquestion function in response-
                        {role:'Response',type:'function',content:'Auth',function_name:'aiquestion',inputs:['Password is not correct try again with correct password!']},
                        Then again you have to repeat checkauth function with user provided password updated to send new password to checkauth function everytime until user response with function result of checkauth and content 0
                        IF content=0 was found then you know you have to call newuser

        CASE-2:User enter its usermail and wants to create new id
            Your response-{role:'Response',type:'function',content:'Auth',function_name:'aiquestion',inputs:['Enter password']},
            //If user havent provided password to create with then you have to call aiquestion function but if user have provided both userid and password you directly can move to next response.
            Your response-{role:'Response',type:'function',content:'Auth',function_name:'newuser',inputs:[<usermail>,<password>]},
            
    Mail Service window flow ==>
    2.The next step if it is using the tool then the response should be like given example(Also must include the input field as of mailid or name of user)
        example-{role:'Response',type:'function',content:<body_of_mail>,function_name:'sendmailtouser',inputs:['mikhailkehlov25@yahoo.com',content]}
         //content again same as in inputs field because mail sending service require atleast receipient and body of mail
    3.The next step if it is not using the tool then the response should be like given example
        example-{role:'Response',type:'output',content:'The mail have been sent succesfully to <this> person'}
    For example:
    Prompt-To devss12@yahoo.com asking about his health
    //If user doesnt provide appropriate or minimum words to strictly copy its body of mail then use your language reasoning to adjust the words accordingly
    Your Response:{role:'Response',type:'function',content:<body_of_mail>,function_name:'checkandinserttodb',inputs:['devss12@yahoo.com']}
    //If the prompt was-To devss12@yahoo.com and gg98@yahoo.com asking about his health
    Then Your Response:{role:'Response',type:'function',content:<body_of_mail>,function_name:'checkandinserttodb',inputs:['devss12@yahoo.com','gg98@yahoo.com']}
    //Here you first check if the provided mailid is in the database if user in next response provided content:{......,content:0} then mailid was not found and successfully inserted and if content:{..........,content:1} then mailid was found and insertion was not performed.
    Next message:{role:'user',content:{type:'function_result',function_name:'checkandinserttodb',content:1}}
    //Here content:{.......,content:1} shows that mailid was found and insertion was not performed
    Your Response:{role:'Response',type:'function',content:<body_of_mail>,function_name:'sendmailtouser',inputs:['devss12@yahoo.com',content]}
    //content again same as in inputs field because mail sending service require atleast receipient and body of mail
    Next message:{role:'user',content:{type:'function_result',function_name:'<function_name>',content:<function_result>}}
    Your response:{role:'Response',type:'output',content:'The mail have been sent succesfully to <this> person'}
    
    CASE 2:To dev sharma asking about his health
    Your Response:{role:'Response',type:'function',content:<body_of_mail>,function_name:'getuserid',inputs:['dev','sharma']}
    Next message:{role:'user',content:{type:'function_result',function_name:'getuserid',content:['devsharma12@yahoo.com','dev_sharma21@gmail.com']}}
    //Even if the content by role:'user' is only 1 like content:['devsharma12@yahoo.com'] you have to ask user which mail to send to ensure no miscalculations
    //Here function result can be one or two in object like ['devsharma12@yahoo.com','dev_sharma21@gmail.com']
    Your Response:{role:'Response',type:'function',content:<body_of_mail>,function_name:'askuser',inputs:['devsharma12@yahoo.com','dev_sharma21@gmail.com']}
    //Here you will ask user which email to send the mail
    Next message:{role:'user',content:{type:'function-result',function_name:'askuser',content:1}}
    //Here 1 signify 'devsharma12@yahoo.com' and 2 signify'dev_sharma21@gmail.com' as role:'response' inputs index_values+1 like this ,inputs:['devsharma12@yahoo.com','dev_sharma21@gmail.com']

    //Also it is important to note that user can use 1,2 or 3,4,10 any combination of numbers, you have to arrange corresponding mailid(s) according to serial number provided from user
    Your Response:{role:'Response',type:'function',content:<body_of_mail>,function_name:'sendmailtouser',inputs:[['devsharma12@yahoo.com','dev_sharma21@gmail.com'],content]}\
    //content again same as in inputs field because mail sending service require atleast one receipient and body of mail
    Next message:{role:'user',content:{type:'function_result',function_name:'sendmailtouser',content:<function_result>}}
    Your Response:{role:'Response',type:'output',content:'The mail have been sent succesfully to <this>,<this>....<this> person'}


    IMPORTANT-1.for direct mailid in prompt by user, you should first run checkandinserttodb to check or insert mail into database
            2.For names instead of hardcoded mail id(s) you can directly run getuserid without running checkandinserttodb

    `}]
let userauthid
async function checkauth(inputs) {
    const id = inputs[0]
    const pass = inputs[1]
    console.log('USed Check auth');
    
    let auth = await prisma.users.findUnique({
        where:{
            usermailid:id
        }
    })
    if (!auth) {
        //'User not found'
        console.log('User not found');
        
        return '0'
    }
    else if (auth.password==pass) {
        //'Auth Successfull'
        console.log('Auth Successfull');
        userauthid=id
        return '1'
    }
    else {
        //'Password is wrong'
        console.log('Password is wrong');
        return '2'
    }

}
async function newuser(inputs) {
    await prisma.users.create({
        data:{
            usermailid:inputs[0],
            password:inputs[1]
        }
    })
    userauthid=inputs[0]
    return `${inputs[0]} user created`
}
// async function setauth(id) {
//     userauthid=id
//     return 'Auth Set'
// }
async function getuserid(namestrings) {
    let usermails= await prisma.users.findMany({
        where:{
            OR:namestrings.map((val,i)=>({
                usermailid:{
                    contains:val,
                    mode:'insensitive'
                },
            })),
        },
    })
    const ml = usermails.map((val,i)=>{
       return val.usermailid
    })
    return ml
}
async function checkandinserttodb(ids) {
    const check = await prisma.mail.findMany({
        where:{
            OR:ids.map((val,i)=>({
                usermailid:userauthid,
                usermails:{
                    contains:val,
                    mode:'insensitive'
                }
            }))
        }
    })
    const nonavailmails = ids.filter((id)=>!check.includes(id))
    if (check.length==ids.length) {
        return '1'
    }
    else {
        await prisma.mail.createMany({
            data:nonavailmails.map((val)=>({
                usermail:val
            }))
        })
        return '0'
    }
}
async function sendmailtouser(id,body) {
    return await sendmail(id,body)
}
async function aiquestion(question) {
    const question2 = readlinesync.question(`${question}:>> `)
    return question2
}
async function askuser(mailsid) {
    // console.log('Using aksuser function');
    // console.log(mailsid);
    let mailsstring=''
    for (let i = 0; i < mailsid.length; i++) {
        mailsstring+=`${i+1}. ${mailsid[i]}\n`
    }
    const nextuser = readlinesync.question(`<<AI>>:Select Mail by Serial No.>>\n${mailsstring}\n<<USER>>:>> `)
    return nextuser
}
const tools={
    getuserid:getuserid,
    sendmailtouser:sendmailtouser,
    askuser:askuser,
    checkandinserttodb:checkandinserttodb,
    checkauth:checkauth,
    newuser:newuser,
    aiquestion:aiquestion
}
// async function chat() {
//     let response = await sarvamclient.chat.completions({
//         messages:messages,
//         temperature: 0.7,
//         top_p: 1,
//         max_tokens: 1000
//     })
//     return response.choices[0].message.content
// }
async function chat() {
    let response = await client.chat.completions.create({
        model:'gemini-2.0-flash',
        messages:messages,
        response_format:{type:'json_object'}
    })
    return response.choices[0].message.content
}

async function start() {
    while (true) {
        let i =1
        let userinput = readlinesync.question('<<USER>>:>> ')
        messages.push({role:'user',content:userinput})
        console.log(messages);
        
        let resp
        // let kk= await chat()
        do {
            let kk= await chat()
            resp = JSON.parse(kk)
            console.log(resp);
            
            //          1.getuserid
            // 2.sendmailtouser
            // 3.askuser
            if (resp.type=='function') {
                ++i
                // console.log(resp);
                // console.log(messages);
                
                // console.log(`running fro i: `,i);
                let fnset = await tools[resp.function_name]
                let fn
                try {
                    fn = await fnset(resp.inputs)
                    // if (resp.function_name=='sendmailtouser') {
                    //     fn = await fnset(resp.input,resp.content)
                    // }
                    // else if (condition) {
                        
                    // }
                    // else fn = await fnset(resp.input?resp.input:'')
                    
                } catch (error) {
                    console.log('error came at if');
                }
                // console.log('fn:>> ',fn);
                
                messages.push({role:'user',content:JSON.stringify({type:'function_result',function_name:resp.function_name,content:fn})})
            }
            else if (resp.type=='output') {
                if (Number(resp.output_code)==0) {
                    console.log(`🤖:>> ${resp.content}`)
                }
                else{
                    console.log(`🤖:>> ${resp.content}`)
                    messages= [{role:'system',content:`
        YOU ARE AN AI AGENT WHICH WORKS FOR sending mail to user from the given prompt.
        You get two required fields from the prompt-
        1.usermail id OR the name of user
        2.body and data of mail to be sent
    
        Available tools:
        1.getuserid
        2.sendmailtouser
        3.askuser
        
        Now, your response must be strictly in JSON format without any unnecessary information.
        structure of response:{role:'Response',type:function/output,content:output or functionname}
        Important-1.Function and function name is available tools
        2.The next step if it is using the tool then the response should be like given example(Also must include the input field as of mailid or name of user)
            example-{role:'Response',type:'function',content:<body_of_mail>,function_name:'sendmailtouser',input:'mikhailkehlov25@yahoo.com'}
        3.The next step if it is not using the tool then the response should be like given example
            example-{role:'Response',type:'output',content:<body_of_mail>}
        For example:
        Prompt-To devss12@yahoo.com asking about his health
        //If user doesnt provide appropriate or minimum words to strictly copy its body of mail then use your language reasoning to adjust the words accordingly
        Your Response:{role:'Response',type:'function',content:<body_of_mail>,function_name:'sendmailtouser',input:'devss12@yahoo.com'}
        Next message:{role:'user',content:{type:'function_result',function_name:'<function_name>',content:<function_result>}}
        Your response:{role:'Response',type:'output',content:'The mail have been sent succesfully to <this> person'}
        
        CASE 2:To dev sharma asking about his health
        Your Response:{role:'Response',type:'function',content:<body_of_mail>,function_name:'getuserid',input:['dev','sharma']}
        Next message:{role:'user',content:{type:'function_result',function_name:'getuserid',content:['devsharma12@yahoo.com','dev_sharma21@gmail.com']}}
        //Here function result can be one or two in object like ['devsharma12@yahoo.com','dev_sharma21@gmail.com']
        Your Response:{role:'Response',type:'function',content:<body_of_mail>,function_name:'askuser',input:['devsharma12@yahoo.com','dev_sharma21@gmail.com']}
        //Here you will ask user which email to send the mail
        Next message:{role:'user',content:{type:'function-result',function_name:'askuser',content:'devsharma12@yahoo.com'}}
        Your Response:{role:'Response',type:'function',content:<body_of_mail>,function_name:'sendmailtouser',input:'devsharma12@yahoo.com'}
        Next message:{role:'user',content:{type:'function_reuslt',function_name:'sendmailtouser',content:<function_result>}}
        Your Response:{role:'Response',type:'output',content:'The mail have been sent succesfully to <this> person'}
    
        `}]
                    break;
                }
            }
        } while (resp.type !='output') 

    }
}
start()
// const ak = await prisma.mail.findMany({})
// console.log(ak);

