import { asyncHandler } from '../utils/asyncHandler.js';
import { apiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { apiResponse } from '../utils/apiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    //validation - not empty
    // check user already exists: username, email
    //check for images, check for avatar
    //upload them to cloudinary, avatar
    // create user object - create entry in db
    //remove password and refresh token from response
    //check for user creation success
    //return res

    const { username, password , email , fullName} = req.body
    console.log('email:', email)


    //for checking one by one
    // if(fullName == "") {
    //     throw new apiError(400, 'required fullName')
    // }

    if(
        [fullName, email, username, password].some((field) => field?.trim === "" )
    ){
        throw new apiError (400, "All Field are Required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
     })

     if(existedUser) {
        throw new apiError(409, "user with username or email already exist")
     }

     const avatarLocalPath = req.files?.avatar[0]?.path;
   //   const coverImageLocalPath = req.files?.coverImage[0]?.path

     let coverImageLocalPath;
     if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) 
      { coverImageLocalPath = req.files.coverImage[0].path
     

     if(!avatarLocalPath){
        throw new apiError(400, "Avatar file is required")
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath)
      const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   

      if(!avatar){
        throw new apiError(400, "Avatar file is required")
      }

      const user = await User.create({
        fullName,
        avatar: avatar.url || "",
        email,
        password,
        username: username.toLowerCase()
      })

     const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
     ) 

     if(!createdUser) {
        throw new apiError(500, "Something Went Wrong While Regestering The User")
     }

     return res.status(201).json(
        new apiResponse(200, createdUser, "User Registed Successfully")
     )

}})

export { registerUser };