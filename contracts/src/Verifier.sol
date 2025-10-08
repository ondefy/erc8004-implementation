// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 20694776904898478825263101001765725521339258937283736395245435675364762942330;
    uint256 constant alphay  = 9606031251928114762903463259920088671217821454045821781179062047985299059474;
    uint256 constant betax1  = 13790807892030752860895002309287279414375223921227068549202192079506201563743;
    uint256 constant betax2  = 21442290205896656478672012424095083684550753546959509147097560395618820539942;
    uint256 constant betay1  = 11587701912212793510061879873549405998437918387469000244332965489014994259401;
    uint256 constant betay2  = 1326542720682105233501120827405942846398002285632009879448437674059872189911;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 19763170586840688588328420328226338105523407883629674775752367098495653950162;
    uint256 constant deltax2 = 16192047636100321889680288501236531132711814959852493833591871256571181490444;
    uint256 constant deltay1 = 12057364391545713540005721608093781513292782528939078122758909543350658678852;
    uint256 constant deltay2 = 1269542093222052953569789748711242046856048873405993262957186207994160158274;

    
    uint256 constant IC0x = 18719237451852536800868099872055580228111460139979708712727209090537516298964;
    uint256 constant IC0y = 5657786752502048180068485102069738169313009519311190538495463651569063864367;
    
    uint256 constant IC1x = 17169869670290169147546189441797870721619874277488001471676505819227210408415;
    uint256 constant IC1y = 13113798745613612434472199726038414381931185347208718543696462261559835599800;
    
    uint256 constant IC2x = 10298727274817512159114058720478840812284813260757642908620603719452258563659;
    uint256 constant IC2y = 10044285186063510523730751441087300778461920707745255691994124562552753387095;
    
    uint256 constant IC3x = 18547470615056686942881186423969538379844340944768709210640743947470355528437;
    uint256 constant IC3y = 13003393923691001509634013151339153790087481763693732912630832618795090198603;
    
    uint256 constant IC4x = 20692945625597797016977523315967421162671687608787113046898782645485807141135;
    uint256 constant IC4y = 86000764007371221026608225115994289897610727290218891353128726903161612510;
    
    uint256 constant IC5x = 17253047955387616712968817099869531493452289228496704190114384947293995189715;
    uint256 constant IC5y = 7476884373778153271330322050363694871861687725688492060425708856403835727900;
    
    uint256 constant IC6x = 444134803130452745798696519328010985857346280888673225544588320356459898600;
    uint256 constant IC6y = 1975035039717830837139619610916244993729823847780376609330432496893878792367;
    
    uint256 constant IC7x = 18223614747896578349135854061249312292101500071972485647976686506572771718871;
    uint256 constant IC7y = 16113603426453372345637391332975942519634289961578288175349231616064940242087;
    
    uint256 constant IC8x = 1260507939860146179249858419864333805936605463836546964181258251043867806389;
    uint256 constant IC8y = 20067671276332010031754620715597858855218311451504700598651989050921990610797;
    
    uint256 constant IC9x = 6906807667448345323925927300963647372661926514252199868555538017088677401015;
    uint256 constant IC9y = 13767801459879415063733437600534462694454102008955019250418374890489895573676;
    
    uint256 constant IC10x = 15164737821318904071566776127179990198604063884428275764804342358533971236466;
    uint256 constant IC10y = 13666758983639968625841896528778384633938492986480762748168935054609204199868;
    
    uint256 constant IC11x = 14703249173648717836511487385968091392024849177695110034760907819615612549484;
    uint256 constant IC11y = 10561887344451989704685188476063899414862322286306451404023108004522584130573;
    
    uint256 constant IC12x = 21532796352102177334791152332713899816191010047005496076342796121402047470380;
    uint256 constant IC12y = 14666994805641008124746321908965965489032670206257664920990544403407984591988;
    
    uint256 constant IC13x = 8384837531626037675041322424166049243295029614680186393974746400018702399081;
    uint256 constant IC13y = 13687111880677781770500825015488529828452844880991978811788795160722206891403;
    
    uint256 constant IC14x = 19344398839269859509153011475272908670382405321524631112331459011779692722199;
    uint256 constant IC14y = 5456043839673387029377321998430291948899605939262848347457088138300971356191;
    
    uint256 constant IC15x = 11753547083894258985035064489949227098492761385314006109363152301098412460811;
    uint256 constant IC15y = 5377494366983317147477550267030639822369306923346632763925452384584212589788;
    
    uint256 constant IC16x = 20478436515529628756902656572357653067965615997545226809502168761337781720021;
    uint256 constant IC16y = 17883711175564162420260603916995255836849946373661836582587268841559571941128;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[16] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
