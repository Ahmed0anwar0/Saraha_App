
export const findOne = async ({ model , filter={} , select="" , populate=[] }={})=>{
    return await model.findOne(filter).select(select).populate(populate)
}

export const findById = async ({ model , id , select="" , populate=[] }={})=>{
    return await model.findById(id).select(select).populate(populate)
}

export const updateOne = async ({ model , filter={} , data={} , options={runValidators:true} }={})=>{
    return await model.updateOne(filter, data , options)
}

export const findOneAndUpdate = async ({ model , filter={} , data={} , select=""  , options={runValidators:true , new:true} , populate=[] }={})=>{
    return await model.findOneAndUpdate(filter, {...data , $inc :{ __v : 1}} , options).select(select).populate(populate)
}

export const deleteOne = async ({ model , filter={}}={})=>{
    return await model.deleteOne(filter)
}