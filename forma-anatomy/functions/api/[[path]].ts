import {handleApi} from '../../server/api';
export const onRequest=(context:{request:Request;env:Record<string,string>})=>handleApi(context.request,context.env);
