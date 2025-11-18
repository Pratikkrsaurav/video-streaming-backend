import { asyncHandler } from '../utils/asyncHandler.js';
import { apiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { apiResponse } from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken = async(userId) =>{
   try{
      const user = await User.findById(userId);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      return { accessToken, refreshToken };

   }catch(error){
      throw new apiError(500, "Something Went Wrong While Generating Tokens")
   }
}

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
        [fullName, email, username, password].some((field) => field?.trim() === "" )
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

const loginUser = asyncHandler(async (req,res) => {
   // get username and password from req.body
   // validation - not empty
   // check user exists with given username
   // if user not found, throw error
   // if user found, verify password
   // if password not match, throw error
   // if password match, generate access token and refresh token
   // return user details access token and reffresh token in response
   // send cookie in response

   const { username, password, email} = req.body;

   if(!(username || password)) {
      throw new apiError(400, "username and password are required")
   }

   const user = await User.findOne({
      $or: [{ username }, { email }]
   })

   if(!user){
      throw new apiError(404, "user not found with given username or email")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)
   if(!isPasswordValid){
      throw new apiError(401, "Invalid user credentials")
   }

   const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   const options = {
      httpOnly: true,
      secure: true,
   }

   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
      new apiResponse(
         200,
         {
            user: loggedInUser,
            accessToken,
            refreshToken
         },
         "user logged in successfully"
       )
   )
})

const logoutUser = asyncHandler(async (req, res) => { 
   User.findByIdAndUpdate(
      req.user._id,
      {
         $set: { refreshToken: undefined}
      },
      { new: true}
   )

   const options = {
      httpOnly: true,
      secure: true,
   }

   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new apiResponse(200, {}, "user logged out"))
})

const refreshAccessToken = asyncHandler( async (req, res) => {
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

if(!incomingRefreshToken){
   throw new apiError(401, "unauthorizerd request")
}

try {
   const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET, 
   )
   
   const user= await User.findById(decodedToken?._id)
   if(!user){
      throw new apiError(401, "Invalid Refresh Token")
   }
   
   if(incomingRefreshToken !== user?.refreshToken){
      throw new apiError(401, "Refresh Token is expired or used")
   }
   
   const options = 
   {
      httpOnly: true,
      secure: true, 
   }
   
   const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
   
   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", newrefreshToken, options)
   .json(
      new apiResponse(
         200,
         { accessToken, newrefreshToken },
         "Access Token Refreshed Successfully"
      )
   )
   
} catch (error) {
   throw new apiError(401, error?.message || "Invalid Refresh Token")
   
}
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const  {oldPassword, newPassword } = req.body

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
      throw new apiError(400, "Old Password is incorrect")
   }

   user.password = newPassword
   await user.save({validateBeforeSave: false})

   return res
   .status(200)
   .json(new apiResponse(200, {}, "Password Changed Successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json(new apiResponse(200, req.user, "Current User fetched Successfully"))
}
)

const updateAccountDetails = asyncHandler (async (req, res) => {
   const {fullName, email, username} = req.body

   if(!(fullName || email || username)) {
      throw new apiError(400, "Atleast one field is required to update")
   }

   const user = User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            fullName,
            email,
            username,
         }
      },
      { new: true }
   ).select("-pasword")

   return res
   .status(200)
   .json(new apiResponse(200, user, "User Details Updated Successfully"))


})

const updateUserAvatar = asyncHandler(async (req, res) => {
   const avatarLocalPath = req.file?.path

   if(!avatarLocalPath) {
      throw new apiError (400, "Avatar file is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   if(!avatar.url) {
      throw new apiError (500, "Something went wrong while uploading avatar")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            avatar: avatar.url
         }
      },
      { new: true }
   ).select("-password")
})

export { registerUser,
         loginUser, 
         logoutUser,
         refreshAccessToken,
         changeCurrentPassword,
         getCurrentUser,
         updateAccountDetails,
         updateUserAvatar
 };