import {model,Schema} from "mongoose";

const bandSchema=new Schema({
    name:{
        type:String, required:[true,"Band name is required"],
        trim:true,
        minlength:[2,"Band name must be at least 2 characters long"],
        maxlength:[80,"Band name must be at most 80 characters long"]
    },
    genre: {

        type:String,
        trim:true,
        maxlength: [50, "Genre cannot exceed 50 characters"],

    },
    timeZone:{

        type:String,
        required:[true,"Time zone is required"],
        trim:true,
        maxlength: [64, "Time zone cannot exceed 64 characters"],
    },
    description:{
        type:String,
        trim:true,
        maxlength: [500, "Description cannot exceed 500 characters"],
    },
},
    {
        timestamps:true,
        versionKey:false,
    },
);
export const BandModel = model("Band", bandSchema);