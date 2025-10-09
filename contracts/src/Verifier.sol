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
    uint256 constant alphax  = 20556776230892760232058782653746384855226043389041462456202456085925722832542;
    uint256 constant alphay  = 17183569241011339413209336767625246025041162754436048476196987808320538829343;
    uint256 constant betax1  = 16037204334951724813949174866342672833873831580959772670469852386270378476979;
    uint256 constant betax2  = 9024518040634329082421885768896828210649617507278299302570367585813566075185;
    uint256 constant betay1  = 16267258971685121624858667021613688700444314701629789924019092864788420316235;
    uint256 constant betay2  = 1140574248884472627935736436992120015658598331030137513179286647947647597549;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 7525320131709470698953890560532110835591117669059228423335556605956148362561;
    uint256 constant deltax2 = 9819025255334919991349545625464563730004171960156667882222452384995319624185;
    uint256 constant deltay1 = 18728864767634558851969025711058177588035716008715195884218834579878972707695;
    uint256 constant deltay2 = 2413309037394167191873507835387065246685965419878819339394676601651378893878;

    
    uint256 constant IC0x = 16195957906509038584849021690938760183968094028809197822876427437658800460697;
    uint256 constant IC0y = 15864235416991398596888829915691962985126464286971699323249628444998450806504;
    
    uint256 constant IC1x = 17598863432166099299115045453561034879784793340871610203901363284310845921959;
    uint256 constant IC1y = 8322445363715388982192761670227111251275507385990972088090622797487669550198;
    
    uint256 constant IC2x = 7324361769950606012466874674620552114642563623839055003787027478441626711496;
    uint256 constant IC2y = 14530892246899629378632787841768541214169938762317647315891966420896966319827;
    
    uint256 constant IC3x = 5316571375821503341920558887713909470440203778602741509685798132944223418293;
    uint256 constant IC3y = 13600866901308412789079291392301944217470283431032367895348040952154536651937;
    
    uint256 constant IC4x = 2632249888628707839028161004241038062677323605934084035385284521902298916687;
    uint256 constant IC4y = 19936424307792820999420741179546232980082501984236656032405816383105878022982;
    
    uint256 constant IC5x = 10551615564156262838696626683378340828031409370290904260700313191094791868519;
    uint256 constant IC5y = 11550831562637117964780351665371676326699305247109441322128936610613698858158;
    
    uint256 constant IC6x = 1850866457092641148593055125348164715213124032141878927103031701560382990337;
    uint256 constant IC6y = 12090377734566055561553327457833141944152635350207241795616342654536884704646;
    
    uint256 constant IC7x = 11703481060381495688136994506320465930121500392258171098642187843867578159738;
    uint256 constant IC7y = 239446616185955363159933745651901678670193397331050350146806525018644550956;
    
    uint256 constant IC8x = 3088544390707148968720728032046474406012671791787364247787079907520633859727;
    uint256 constant IC8y = 20858153182611834012008689537868420431188470487413247140234055319384959256521;
    
    uint256 constant IC9x = 9891571046460203044118714094266430375516824441012512130684746826088936757142;
    uint256 constant IC9y = 16282923134959903360459919458324255199424608821798022739333452372197946745125;
    
    uint256 constant IC10x = 5577255169061237587801350201148250637293672388621885984951736297356832734339;
    uint256 constant IC10y = 7718703633515912395352494031350831298391516371403015165558584090703299004325;
    
    uint256 constant IC11x = 12122165332104902444731818088183719701927323817295873405163940075372404758567;
    uint256 constant IC11y = 10121669179177764761045184507255116148013140333296320570539900311709282614381;
    
    uint256 constant IC12x = 7354408357933390811328319147267866352900636502763158266013528070524944931696;
    uint256 constant IC12y = 5591472918948110013891879287448458369114927759963450125973516894388072814146;
    
    uint256 constant IC13x = 8030695887848411706999087445435231047839126901009898282558361707907076646462;
    uint256 constant IC13y = 18926734208994158243190110762809675251792342085898580197480647771009224116771;
    
    uint256 constant IC14x = 4912597011449456522482165984225440894573105269803510002310395243259532478249;
    uint256 constant IC14y = 9814633228411190755383154849755411877989008214110571728416344159145306406258;
    
    uint256 constant IC15x = 15374210785363070766263446480578448714853214750914724440426331935269184590147;
    uint256 constant IC15y = 20198717871081671455183100452725340602504139676178371663641402446652149259026;
    
    uint256 constant IC16x = 10183945053878539361648592992762648041290265045943102730784063534607720972267;
    uint256 constant IC16y = 14659558180950052308554620720869832541137921500154804215631273379768469961607;
    
 
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
